using Microsoft.EntityFrameworkCore;
using Ohs.Api.Contracts;
using Ohs.Api.Data;
using Ohs.Api.Domain;
using System.Linq;

namespace Ohs.Api.Services;

public sealed class IncidentService : IIncidentService
{
    private readonly OhsDbContext _db;
    private readonly IHealthDataCrypto _crypto;
    private readonly IPrivacyAuditWriter _audit;
    private readonly TimeProvider _timeProvider;

    public IncidentService(
        OhsDbContext db,
        IHealthDataCrypto crypto,
        IPrivacyAuditWriter audit,
        TimeProvider timeProvider)
    {
        _db = db;
        _crypto = crypto;
        _audit = audit;
        _timeProvider = timeProvider;
    }

    public async Task<IncidentDto> StartDraftAsync(
        CreateIncidentDraftRequest request,
        UserContext actor,
        CancellationToken cancellationToken)
    {
        EnsureRole(actor, UserRole.Supervisor, UserRole.Ohs, UserRole.Manager);

        if (request.DateTime > _timeProvider.GetUtcNow().AddMinutes(5))
        {
            throw new DomainException("Incident date_time cannot be in the future.");
        }

        var now = _timeProvider.GetUtcNow();
        var incident = new Incident
        {
            Id = Guid.NewGuid(),
            Type = request.Type,
            DateTime = request.DateTime,
            ReporterId = actor.UserId,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Status = IncidentStatus.Open,
            IsDraft = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        if (!string.IsNullOrWhiteSpace(request.HealthDataJson))
        {
            var encrypted = await _crypto.EncryptAsync(request.HealthDataJson, cancellationToken);
            incident.HealthPayload = new IncidentHealthPayload
            {
                IncidentId = incident.Id,
                Ciphertext = encrypted.Ciphertext,
                Iv = encrypted.Iv,
                AuthTag = encrypted.AuthTag,
                KeyVersion = encrypted.KeyVersion,
                CreatedAt = now
            };
        }

        _db.Incidents.Add(incident);
        _db.OutboxEvents.Add(OutboxEvent.Create(
            aggregateType: "incident",
            aggregateId: incident.Id,
            eventType: "incident.draft.created",
            payload: new { incident.Id, incident.Type, incident.ReporterId, incident.DateTime }));

        await _db.SaveChangesAsync(cancellationToken);

        await _audit.WriteAsync(actor, "incident", incident.Id, "create", "Draft incident created", cancellationToken);
        return incident.ToDto();
    }

    public async Task<IncidentDto> UpdateDraftDetailsAsync(
        Guid incidentId,
        UpdateIncidentDetailsRequest request,
        UserContext actor,
        CancellationToken cancellationToken)
    {
        EnsureRole(actor, UserRole.Supervisor, UserRole.Ohs, UserRole.Manager);

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            throw new DomainException("Incident description is required.");
        }

        var incident = await GetOwnedDraftAsync(incidentId, actor, cancellationToken);

        incident.LocationId = request.LocationId;
        incident.Description = request.Description.Trim();
        incident.DateTime = request.DateTime;
        incident.UpdatedAt = _timeProvider.GetUtcNow();

        _db.OutboxEvents.Add(OutboxEvent.Create(
            aggregateType: "incident",
            aggregateId: incident.Id,
            eventType: "incident.draft.updated",
            payload: new { incident.Id, incident.LocationId }));

        await _db.SaveChangesAsync(cancellationToken);

        await _audit.WriteAsync(actor, "incident", incident.Id, "update", "Draft details updated", cancellationToken);
        return incident.ToDto();
    }

    public async Task<IncidentDto> AddDraftPhotosAsync(
        Guid incidentId,
        AddIncidentPhotosRequest request,
        UserContext actor,
        CancellationToken cancellationToken)
    {
        EnsureRole(actor, UserRole.Supervisor, UserRole.Ohs, UserRole.Manager);

        if (request.PhotoUrls is null || request.PhotoUrls.Count == 0)
        {
            throw new DomainException("At least one photo URL is required.");
        }

        var incident = await GetOwnedDraftAsync(incidentId, actor, cancellationToken);

        var incomingUrls = request.PhotoUrls
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (incomingUrls.Count == 0)
        {
            throw new DomainException("No valid photo URLs were provided.");
        }

        foreach (var url in incomingUrls)
        {
            if (!incident.PhotoUrls.Contains(url, StringComparer.OrdinalIgnoreCase))
            {
                incident.PhotoUrls.Add(url);
            }
        }

        incident.UpdatedAt = _timeProvider.GetUtcNow();

        _db.OutboxEvents.Add(OutboxEvent.Create(
            aggregateType: "incident",
            aggregateId: incident.Id,
            eventType: "incident.draft.photos_added",
            payload: new { incident.Id, AddedPhotoCount = incomingUrls.Count }));

        await _db.SaveChangesAsync(cancellationToken);

        await _audit.WriteAsync(actor, "incident", incident.Id, "update", "Draft photos added", cancellationToken);
        return incident.ToDto();
    }

    public async Task<IncidentDto> SubmitDraftAsync(
        Guid incidentId,
        UserContext actor,
        CancellationToken cancellationToken)
    {
        EnsureRole(actor, UserRole.Supervisor, UserRole.Ohs, UserRole.Manager);

        var incident = await GetOwnedDraftAsync(incidentId, actor, cancellationToken);

        if (incident.LocationId is null)
        {
            throw new DomainException("Location is required before submitting an incident.");
        }

        if (string.IsNullOrWhiteSpace(incident.Description))
        {
            throw new DomainException("Description is required before submitting an incident.");
        }

        if (incident.PhotoUrls.Count == 0)
        {
            throw new DomainException("At least one photo is required before submitting an incident.");
        }

        incident.IsDraft = false;
        incident.Status = IncidentStatus.Open;
        incident.UpdatedAt = _timeProvider.GetUtcNow();

        _db.OutboxEvents.Add(OutboxEvent.Create(
            aggregateType: "incident",
            aggregateId: incident.Id,
            eventType: "incident.reported",
            payload: new { incident.Id, incident.ReporterId, incident.DateTime, incident.LocationId }));

        await _db.SaveChangesAsync(cancellationToken);

        await _audit.WriteAsync(actor, "incident", incident.Id, "create", "Incident submitted", cancellationToken);
        return incident.ToDto();
    }

    public async Task<IncidentDto> UpdateIncidentAsync(
        Guid incidentId,
        UpdateIncidentRequest request,
        UserContext actor,
        CancellationToken cancellationToken)
    {
        EnsureRole(actor, UserRole.Supervisor, UserRole.Ohs, UserRole.Manager);

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            throw new DomainException("Description cannot be empty.");
        }

        var incident = await _db.Incidents
            .SingleOrDefaultAsync(x => x.Id == incidentId, cancellationToken)
            ?? throw new DomainException("Incident not found.");

        if (incident.IsDraft)
        {
            throw new DomainException("Draft incidents should be updated through draft endpoints.");
        }

        incident.Description = request.Description.Trim();

        if (request.Status is not null)
        {
            ValidateStatusTransition(incident.Status, request.Status.Value, actor.Role);
            incident.Status = request.Status.Value;
        }

        incident.UpdatedAt = _timeProvider.GetUtcNow();

        _db.OutboxEvents.Add(OutboxEvent.Create(
            aggregateType: "incident",
            aggregateId: incident.Id,
            eventType: "incident.updated",
            payload: new { incident.Id, incident.Status }));

        await _db.SaveChangesAsync(cancellationToken);

        await _audit.WriteAsync(actor, "incident", incident.Id, "update", "Incident updated", cancellationToken);
        return incident.ToDto();
    }

    private async Task<Incident> GetOwnedDraftAsync(
        Guid incidentId,
        UserContext actor,
        CancellationToken cancellationToken)
    {
        var incident = await _db.Incidents
            .SingleOrDefaultAsync(x => x.Id == incidentId && x.IsDraft, cancellationToken)
            ?? throw new DomainException("Draft incident not found.");

        var isOwner = incident.ReporterId == actor.UserId;
        var isOhs = actor.Role == UserRole.Ohs;

        if (!isOwner && !isOhs)
        {
            throw new DomainException("Only the reporter or OHS can update this draft.");
        }

        return incident;
    }

    private static void EnsureRole(UserContext actor, params UserRole[] allowed)
    {
        if (!allowed.Contains(actor.Role))
        {
            throw new DomainException("You are not authorized for this operation.");
        }
    }

    private static void ValidateStatusTransition(IncidentStatus current, IncidentStatus next, UserRole actorRole)
    {
        if (next < current)
        {
            throw new DomainException("Incident status cannot move backwards.");
        }

        if (next == IncidentStatus.Closed && actorRole != UserRole.Ohs)
        {
            throw new DomainException("Only OHS can close an incident.");
        }
    }
}

internal static class IncidentMapping
{
    public static IncidentDto ToDto(this Incident incident)
    {
        return new IncidentDto(
            incident.Id,
            incident.Type,
            incident.DateTime,
            incident.LocationId,
            incident.ReporterId,
            incident.Description,
            incident.Status,
            incident.IsDraft,
            incident.PhotoUrls,
            incident.CreatedAt,
            incident.UpdatedAt);
    }
}

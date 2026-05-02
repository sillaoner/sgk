using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Ohs.Api.Contracts;
using Ohs.Api.Data;
using Ohs.Api.Domain;
using System.Linq;

namespace Ohs.Api.Services;

public sealed class AnalysisService : IAnalysisService
{
    private readonly OhsDbContext _db;
    private readonly IPrivacyAuditWriter _audit;
    private readonly TimeProvider _timeProvider;

    public AnalysisService(
        OhsDbContext db,
        IPrivacyAuditWriter audit,
        TimeProvider timeProvider)
    {
        _db = db;
        _audit = audit;
        _timeProvider = timeProvider;
    }

    public async Task<RootCauseAnalysisDto> UpsertAnalysisAsync(
        Guid incidentId,
        UpsertRootCauseAnalysisRequest request,
        UserContext actor,
        CancellationToken cancellationToken)
    {
        EnsureRole(actor, UserRole.Ohs);

        if (string.IsNullOrWhiteSpace(request.Cause1))
        {
            throw new DomainException("cause_1 is required for 5 Whys analysis.");
        }

        var incident = await _db.Incidents
            .SingleOrDefaultAsync(x => x.Id == incidentId, cancellationToken)
            ?? throw new KeyNotFoundException("Incident not found.");

        if (incident.IsDraft)
        {
            throw new DomainException("Draft incidents cannot enter analysis.");
        }

        if (incident.Status == IncidentStatus.Closed)
        {
            throw new DomainException("Closed incidents cannot be modified.");
        }

        var analysis = await _db.RootCauseAnalyses
            .Include(x => x.Actions)
            .SingleOrDefaultAsync(x => x.IncidentId == incidentId, cancellationToken);

        var now = _timeProvider.GetUtcNow();
        if (analysis is null)
        {
            analysis = new RootCauseAnalysis
            {
                Id = Guid.NewGuid(),
                IncidentId = incidentId,
                CreatedAt = now
            };

            _db.RootCauseAnalyses.Add(analysis);
        }

        analysis.Cause1 = request.Cause1.Trim();
        analysis.Cause2 = request.Cause2?.Trim();
        analysis.Cause3 = request.Cause3?.Trim();
        analysis.Cause4 = request.Cause4?.Trim();
        analysis.Cause5 = request.Cause5?.Trim();
        analysis.Category = request.Category;
        analysis.FishboneJson = ParseFishbone(request.FishboneJson);
        analysis.AnalystId = actor.UserId;
        analysis.UpdatedAt = now;

        incident.Status = IncidentStatus.Analysis;
        incident.UpdatedAt = now;

        _db.OutboxEvents.Add(OutboxEvent.Create(
            aggregateType: "analysis",
            aggregateId: analysis.Id,
            eventType: "analysis.upserted",
            payload: new { analysis.Id, analysis.IncidentId, analysis.AnalystId }));

        await _db.SaveChangesAsync(cancellationToken);

        await _audit.WriteAsync(actor, "analysis", analysis.Id, "update", "Root cause analysis upserted", cancellationToken);
        return analysis.ToDto();
    }

    public async Task<ActionDto> CreateActionAsync(
        Guid analysisId,
        CreateActionRequest request,
        UserContext actor,
        CancellationToken cancellationToken)
    {
        EnsureRole(actor, UserRole.Ohs);

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            throw new DomainException("Action description is required.");
        }

        var analysis = await _db.RootCauseAnalyses
            .SingleOrDefaultAsync(x => x.Id == analysisId, cancellationToken)
            ?? throw new KeyNotFoundException("Analysis not found.");

        var now = _timeProvider.GetUtcNow();
        var action = new CorrectiveAction
        {
            Id = Guid.NewGuid(),
            AnalysisId = analysis.Id,
            Description = request.Description.Trim(),
            ResponsibleId = request.ResponsibleId,
            EndDate = request.EndDate,
            Status = ActionStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Actions.Add(action);
        _db.OutboxEvents.Add(OutboxEvent.Create(
            aggregateType: "action",
            aggregateId: action.Id,
            eventType: "action.created",
            payload: new { action.Id, action.AnalysisId, action.ResponsibleId, action.EndDate }));

        await _db.SaveChangesAsync(cancellationToken);

        await _audit.WriteAsync(actor, "action", action.Id, "create", "Corrective action created", cancellationToken);
        return action.ToDto();
    }

    public async Task<ActionDto> MarkActionCompletedAsync(
        Guid actionId,
        UserContext actor,
        CancellationToken cancellationToken)
    {
        EnsureRole(actor, UserRole.Supervisor, UserRole.Manager, UserRole.Ohs, UserRole.Hr);

        var action = await _db.Actions
            .SingleOrDefaultAsync(x => x.Id == actionId, cancellationToken)
            ?? throw new KeyNotFoundException("Action not found.");

        if (action.ResponsibleId != actor.UserId && actor.Role != UserRole.Manager && actor.Role != UserRole.Ohs)
        {
            throw new DomainException("Only responsible user, manager, or OHS can complete this action.");
        }

        if (action.Status == ActionStatus.Completed)
        {
            return action.ToDto();
        }

        var now = _timeProvider.GetUtcNow();
        action.Status = ActionStatus.Completed;
        action.CompletedAt = now;
        action.CompletedBy = actor.UserId;
        action.UpdatedAt = now;

        _db.OutboxEvents.Add(OutboxEvent.Create(
            aggregateType: "action",
            aggregateId: action.Id,
            eventType: "action.completed",
            payload: new { action.Id, action.AnalysisId, action.CompletedBy }));

        await _db.SaveChangesAsync(cancellationToken);

        await _audit.WriteAsync(actor, "action", action.Id, "update", "Corrective action completed", cancellationToken);
        return action.ToDto();
    }

    public async Task<ActionDto> ApproveActionCompletionAsync(
        Guid actionId,
        UserContext actor,
        CancellationToken cancellationToken)
    {
        EnsureRole(actor, UserRole.Ohs);

        var action = await _db.Actions
            .SingleOrDefaultAsync(x => x.Id == actionId, cancellationToken)
            ?? throw new KeyNotFoundException("Action not found.");

        if (action.Status != ActionStatus.Completed)
        {
            throw new DomainException("Action must be completed before OHS approval.");
        }

        if (action.OhsApprovalAt is not null)
        {
            return action.ToDto();
        }

        var now = _timeProvider.GetUtcNow();
        action.OhsApprovalAt = now;
        action.OhsApprovedBy = actor.UserId;
        action.UpdatedAt = now;

        _db.OutboxEvents.Add(OutboxEvent.Create(
            aggregateType: "action",
            aggregateId: action.Id,
            eventType: "action.approved",
            payload: new { action.Id, action.AnalysisId, action.OhsApprovedBy }));

        await _db.SaveChangesAsync(cancellationToken);

        await _audit.WriteAsync(actor, "action", action.Id, "approve", "Corrective action approved by OHS", cancellationToken);
        return action.ToDto();
    }

    public async Task CloseIncidentIfReadyAsync(
        Guid incidentId,
        UserContext actor,
        CancellationToken cancellationToken)
    {
        EnsureRole(actor, UserRole.Ohs);

        var incident = await _db.Incidents
            .Include(x => x.RootCauseAnalysis)
            .ThenInclude(x => x!.Actions)
            .SingleOrDefaultAsync(x => x.Id == incidentId, cancellationToken)
            ?? throw new KeyNotFoundException("Incident not found.");

        if (incident.RootCauseAnalysis is null)
        {
            throw new DomainException("Incident cannot be closed without root cause analysis.");
        }

        if (incident.RootCauseAnalysis.Actions.Count == 0)
        {
            throw new DomainException("Incident cannot be closed without corrective actions.");
        }

        var hasPendingOrUnapproved = incident.RootCauseAnalysis.Actions
            .Any(x => x.Status != ActionStatus.Completed || x.OhsApprovalAt is null);

        if (hasPendingOrUnapproved)
        {
            throw new DomainException("All actions must be completed and approved before closing incident.");
        }

        var now = _timeProvider.GetUtcNow();
        incident.Status = IncidentStatus.Closed;
        incident.UpdatedAt = now;

        _db.OutboxEvents.Add(OutboxEvent.Create(
            aggregateType: "incident",
            aggregateId: incident.Id,
            eventType: "incident.closed",
            payload: new { incident.Id, ClosedBy = actor.UserId }));

        await _db.SaveChangesAsync(cancellationToken);

        await _audit.WriteAsync(actor, "incident", incident.Id, "close", "Incident closed by OHS", cancellationToken);
    }

    private static JsonDocument ParseFishbone(string? fishboneJson)
    {
        if (string.IsNullOrWhiteSpace(fishboneJson))
        {
            return JsonDocument.Parse("{}");
        }

        try
        {
            return JsonDocument.Parse(fishboneJson);
        }
        catch (JsonException ex)
        {
            throw new DomainException($"Fishbone JSON is invalid: {ex.Message}");
        }
    }

    private static void EnsureRole(UserContext actor, params UserRole[] allowed)
    {
        if (!allowed.Contains(actor.Role))
        {
            throw new DomainException("You are not authorized for this operation.");
        }
    }
}

internal static class AnalysisMapping
{
    public static RootCauseAnalysisDto ToDto(this RootCauseAnalysis analysis)
    {
        return new RootCauseAnalysisDto(
            analysis.Id,
            analysis.IncidentId,
            analysis.Cause1,
            analysis.Cause2,
            analysis.Cause3,
            analysis.Cause4,
            analysis.Cause5,
            analysis.Category,
            analysis.FishboneJson.RootElement.GetRawText(),
            analysis.AnalystId,
            analysis.Actions.Select(x => x.ToDto()).ToList(),
            analysis.CreatedAt,
            analysis.UpdatedAt);
    }

    public static ActionDto ToDto(this CorrectiveAction action)
    {
        return new ActionDto(
            action.Id,
            action.AnalysisId,
            action.Description,
            action.ResponsibleId,
            action.EndDate,
            action.Status,
            action.CompletedAt,
            action.OhsApprovalAt,
            action.CreatedAt,
            action.UpdatedAt);
    }
}

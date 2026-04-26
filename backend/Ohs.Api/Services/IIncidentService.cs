using Ohs.Api.Contracts;

namespace Ohs.Api.Services;

public interface IIncidentService
{
    Task<IncidentDto> StartDraftAsync(
        CreateIncidentDraftRequest request,
        UserContext actor,
        CancellationToken cancellationToken);

    Task<IncidentDto> UpdateDraftDetailsAsync(
        Guid incidentId,
        UpdateIncidentDetailsRequest request,
        UserContext actor,
        CancellationToken cancellationToken);

    Task<IncidentDto> AddDraftPhotosAsync(
        Guid incidentId,
        AddIncidentPhotosRequest request,
        UserContext actor,
        CancellationToken cancellationToken);

    Task<IncidentDto> SubmitDraftAsync(
        Guid incidentId,
        UserContext actor,
        CancellationToken cancellationToken);

    Task<IncidentDto> UpdateIncidentAsync(
        Guid incidentId,
        UpdateIncidentRequest request,
        UserContext actor,
        CancellationToken cancellationToken);
}

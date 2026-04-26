using Ohs.Api.Contracts;

namespace Ohs.Api.Services;

public interface IAnalysisService
{
    Task<RootCauseAnalysisDto> UpsertAnalysisAsync(
        Guid incidentId,
        UpsertRootCauseAnalysisRequest request,
        UserContext actor,
        CancellationToken cancellationToken);

    Task<ActionDto> CreateActionAsync(
        Guid analysisId,
        CreateActionRequest request,
        UserContext actor,
        CancellationToken cancellationToken);

    Task<ActionDto> MarkActionCompletedAsync(
        Guid actionId,
        UserContext actor,
        CancellationToken cancellationToken);

    Task<ActionDto> ApproveActionCompletionAsync(
        Guid actionId,
        UserContext actor,
        CancellationToken cancellationToken);

    Task CloseIncidentIfReadyAsync(
        Guid incidentId,
        UserContext actor,
        CancellationToken cancellationToken);
}

using Ohs.Api.Domain;

namespace Ohs.Api.Contracts;

public sealed record UpsertRootCauseAnalysisRequest(
    string Cause1,
    string? Cause2,
    string? Cause3,
    string? Cause4,
    string? Cause5,
    AnalysisCategory Category,
    string? FishboneJson
);

public sealed record CreateActionRequest(
    string Description,
    Guid ResponsibleId,
    DateOnly EndDate
);

public sealed record RootCauseAnalysisDto(
    Guid Id,
    Guid IncidentId,
    string Cause1,
    string? Cause2,
    string? Cause3,
    string? Cause4,
    string? Cause5,
    AnalysisCategory Category,
    string FishboneJson,
    Guid AnalystId,
    IReadOnlyCollection<ActionDto> Actions,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public sealed record ActionDto(
    Guid Id,
    Guid AnalysisId,
    string Description,
    Guid ResponsibleId,
    DateOnly EndDate,
    ActionStatus Status,
    DateTimeOffset? CompletedAt,
    DateTimeOffset? OhsApprovalAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

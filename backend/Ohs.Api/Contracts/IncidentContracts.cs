using Ohs.Api.Domain;

namespace Ohs.Api.Contracts;

public sealed record CreateIncidentDraftRequest(
    IncidentType Type,
    DateTimeOffset DateTime,
    string? Description,
    string? HealthDataJson
);

public sealed record UpdateIncidentDetailsRequest(
    Guid LocationId,
    string Description,
    DateTimeOffset DateTime
);

public sealed record AddIncidentPhotosRequest(
    IReadOnlyCollection<string> PhotoUrls
);

public sealed record UpdateIncidentRequest(
    string Description,
    IncidentStatus? Status
);

public sealed record IncidentDto(
    Guid Id,
    IncidentType Type,
    DateTimeOffset DateTime,
    Guid? LocationId,
    Guid ReporterId,
    string? Description,
    IncidentStatus Status,
    bool IsDraft,
    IReadOnlyCollection<string> PhotoUrls,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

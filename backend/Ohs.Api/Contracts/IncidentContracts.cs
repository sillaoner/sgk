using Ohs.Api.Domain;
using System.Text.Json.Serialization;

namespace Ohs.Api.Contracts;

public sealed record CreateIncidentDraftRequest(
    [property: JsonConverter(typeof(JsonStringEnumConverter<IncidentType>))]
    IncidentType Type,
    DateTimeOffset OccurredAt,
    Guid? LocationId,
    string? Description,
    string? HealthDataJson,
    IReadOnlyCollection<string>? PhotoUrls
);

public sealed record UpdateIncidentDetailsRequest(
    Guid LocationId,
    string Description,
    DateTimeOffset DateTime
);

public sealed record AddIncidentPhotosRequest(
    IReadOnlyCollection<string> PhotoUrls
);

public sealed class UpdateIncidentRequest
{
    public string? Description { get; init; }
    public IncidentStatus? Status { get; init; }
}

public sealed class UpdateIncidentStatusRequest
{
    public string? Status { get; init; }
}

public sealed class UpdateIncidentApiRequest
{
    public string? Description { get; init; }
    public string? Status { get; init; }
}

public sealed record IncidentDto(
    Guid Id,
    IncidentType Type,
    DateTimeOffset OccurredAt,
    Guid? LocationId,
    Guid ReporterId,
    string? Description,
    IncidentStatus Status,
    bool IsDraft,
    IReadOnlyCollection<string> PhotoUrls,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

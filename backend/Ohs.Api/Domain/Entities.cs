using System.Text.Json;

namespace Ohs.Api.Domain;

public enum UserRole
{
    Ohs,
    Supervisor,
    Manager,
    Hr
}

public enum IncidentType
{
    Accident,
    NearMiss
}

public enum IncidentStatus
{
    Open,
    Analysis,
    Closed
}

public enum AnalysisCategory
{
    Human,
    Machine,
    Method,
    Material,
    Measurement,
    Environment,
    Management,
    Other
}

public enum ActionStatus
{
    Pending,
    Completed
}

public enum LegalReportType
{
    Sgk,
    Ministry
}

public sealed class Department
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public sealed class Location
{
    public Guid Id { get; set; }
    public string SiteName { get; set; } = string.Empty;
    public string? Building { get; set; }
    public string? LineName { get; set; }
    public string? Floor { get; set; }
    public string? AreaCode { get; set; }
}

public sealed class User
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class Incident
{
    public Guid Id { get; set; }
    public IncidentType Type { get; set; }
    public DateTimeOffset DateTime { get; set; }
    public Guid ReporterId { get; set; }
    public User Reporter { get; set; } = default!;
    public Guid? LocationId { get; set; }
    public Location? Location { get; set; }
    public string? Description { get; set; }
    public IncidentStatus Status { get; set; } = IncidentStatus.Open;
    public List<string> PhotoUrls { get; set; } = [];
    public bool IsDraft { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public IncidentHealthPayload? HealthPayload { get; set; }
    public RootCauseAnalysis? RootCauseAnalysis { get; set; }
}

public sealed class IncidentHealthPayload
{
    public Guid IncidentId { get; set; }
    public Incident Incident { get; set; } = default!;
    public byte[] Ciphertext { get; set; } = [];
    public byte[] Iv { get; set; } = [];
    public byte[] AuthTag { get; set; } = [];
    public int KeyVersion { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class RootCauseAnalysis
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public Incident Incident { get; set; } = default!;
    public string Cause1 { get; set; } = string.Empty;
    public string? Cause2 { get; set; }
    public string? Cause3 { get; set; }
    public string? Cause4 { get; set; }
    public string? Cause5 { get; set; }
    public AnalysisCategory Category { get; set; }
    public JsonDocument FishboneJson { get; set; } = JsonDocument.Parse("{}");
    public Guid AnalystId { get; set; }
    public User Analyst { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public List<CorrectiveAction> Actions { get; set; } = [];
}

public sealed class CorrectiveAction
{
    public Guid Id { get; set; }
    public Guid AnalysisId { get; set; }
    public RootCauseAnalysis Analysis { get; set; } = default!;
    public string Description { get; set; } = string.Empty;
    public Guid ResponsibleId { get; set; }
    public User Responsible { get; set; } = default!;
    public DateOnly EndDate { get; set; }
    public ActionStatus Status { get; set; } = ActionStatus.Pending;
    public DateTimeOffset? CompletedAt { get; set; }
    public Guid? CompletedBy { get; set; }
    public DateTimeOffset? OhsApprovalAt { get; set; }
    public Guid? OhsApprovedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class LegalReport
{
    public Guid Id { get; set; }
    public LegalReportType Type { get; set; }
    public NpgsqlTypes.NpgsqlRange<DateOnly> Period { get; set; }
    public string PdfUrl { get; set; } = string.Empty;
    public Guid? GeneratedBy { get; set; }
    public DateTimeOffset GeneratedAt { get; set; }
}

public sealed class AccessLog
{
    public long Id { get; set; }
    public Guid? ActorUserId { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class OutboxEvent
{
    public Guid Id { get; set; }
    public string AggregateType { get; set; } = string.Empty;
    public Guid AggregateId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public JsonDocument Payload { get; set; } = JsonDocument.Parse("{}");
    public DateTimeOffset OccurredAt { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }
    public int RetryCount { get; set; }

    public static OutboxEvent Create(string aggregateType, Guid aggregateId, string eventType, object payload)
    {
        return new OutboxEvent
        {
            Id = Guid.NewGuid(),
            AggregateType = aggregateType,
            AggregateId = aggregateId,
            EventType = eventType,
            Payload = JsonSerializer.SerializeToDocument(payload),
            OccurredAt = DateTimeOffset.UtcNow
        };
    }
}

namespace Ohs.Api.Contracts;

public sealed record DashboardSummaryDto(
    int TotalIncidents,
    int OpenIncidents,
    int IncidentsInAnalysis,
    int ClosedIncidents,
    int PendingActions,
    int OverdueActions
);

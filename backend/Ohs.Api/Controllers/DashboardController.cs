using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ohs.Api.Contracts;
using Ohs.Api.Data;
using Ohs.Api.Domain;

namespace Ohs.Api.Controllers;

[ApiController]
[Authorize(Roles = "supervisor,ohs,manager,hr")]
[Route("api/dashboard")]
public sealed class DashboardController : ControllerBase
{
    private readonly OhsDbContext _db;

    public DashboardController(OhsDbContext db)
    {
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var totalIncidents = await _db.Incidents.CountAsync(cancellationToken);
        var openIncidents = await _db.Incidents.CountAsync(x => x.Status == IncidentStatus.Open, cancellationToken);
        var incidentsInAnalysis = await _db.Incidents.CountAsync(x => x.Status == IncidentStatus.Analysis, cancellationToken);
        var closedIncidents = await _db.Incidents.CountAsync(x => x.Status == IncidentStatus.Closed, cancellationToken);
        var pendingActions = await _db.Actions.CountAsync(x => x.Status == ActionStatus.Pending, cancellationToken);
        var overdueActions = await _db.Actions.CountAsync(
            x => x.Status == ActionStatus.Pending && x.EndDate < today,
            cancellationToken);

        return Ok(new DashboardSummaryDto(
            TotalIncidents: totalIncidents,
            OpenIncidents: openIncidents,
            IncidentsInAnalysis: incidentsInAnalysis,
            ClosedIncidents: closedIncidents,
            PendingActions: pendingActions,
            OverdueActions: overdueActions));
    }
}

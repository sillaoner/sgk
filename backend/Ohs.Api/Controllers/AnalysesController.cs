using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Ohs.Api.Contracts;
using Ohs.Api.Data;
using Ohs.Api.Domain;
using Ohs.Api.Services;

namespace Ohs.Api.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public sealed class AnalysesController : ControllerBase
{
    private readonly IAnalysisService _analysisService;
    private readonly OhsDbContext _db;

    public AnalysesController(IAnalysisService analysisService, OhsDbContext db)
    {
        _analysisService = analysisService;
        _db = db;
    }

    [HttpGet("analyses")]
    [Authorize(Roles = "supervisor,ohs,manager,hr")]
    public async Task<ActionResult<IReadOnlyCollection<RootCauseAnalysisDto>>> ListAnalyses(CancellationToken cancellationToken)
    {
        var analyses = await _db.RootCauseAnalyses
            .AsNoTracking()
            .Include(x => x.Actions)
            .OrderByDescending(x => x.UpdatedAt)
            .Take(500)
            .ToListAsync(cancellationToken);

        var response = analyses.Select(x => new RootCauseAnalysisDto(
            x.Id,
            x.IncidentId,
            x.Cause1,
            x.Cause2,
            x.Cause3,
            x.Cause4,
            x.Cause5,
            x.Category,
            x.FishboneJson.RootElement.GetRawText(),
            x.AnalystId,
            x.Actions.Select(a => new ActionDto(
                a.Id,
                a.AnalysisId,
                a.Description,
                a.ResponsibleId,
                a.EndDate,
                a.Status,
                a.CompletedAt,
                a.OhsApprovalAt,
                a.CreatedAt,
                a.UpdatedAt)).ToList(),
            x.CreatedAt,
            x.UpdatedAt)).ToList();

        return Ok(response);
    }

    [HttpPut("incidents/{incidentId:guid}/analysis")]
    [Authorize(Roles = "ohs")]
    public async Task<ActionResult<RootCauseAnalysisDto>> UpsertAnalysis(
        Guid incidentId,
        [FromBody] UpsertRootCauseAnalysisRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _analysisService.UpsertAnalysisAsync(incidentId, request, BuildUserContext(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("analyses/{analysisId:guid}/actions")]
    [Authorize(Roles = "ohs")]
    public async Task<ActionResult<ActionDto>> CreateAction(
        Guid analysisId,
        [FromBody] CreateActionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _analysisService.CreateActionAsync(analysisId, request, BuildUserContext(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("actions/{actionId:guid}/complete")]
    [Authorize(Roles = "supervisor,manager,ohs,hr")]
    public async Task<ActionResult<ActionDto>> CompleteAction(
        Guid actionId,
        CancellationToken cancellationToken)
    {
        var result = await _analysisService.MarkActionCompletedAsync(actionId, BuildUserContext(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("actions/{actionId:guid}/approve")]
    [Authorize(Roles = "ohs")]
    public async Task<ActionResult<ActionDto>> ApproveAction(
        Guid actionId,
        CancellationToken cancellationToken)
    {
        var result = await _analysisService.ApproveActionCompletionAsync(actionId, BuildUserContext(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("incidents/{incidentId:guid}/close")]
    [Authorize(Roles = "ohs")]
    public async Task<IActionResult> CloseIncident(Guid incidentId, CancellationToken cancellationToken)
    {
        await _analysisService.CloseIncidentIfReadyAsync(incidentId, BuildUserContext(), cancellationToken);
        return NoContent();
    }

    private UserContext BuildUserContext()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("Missing user id claim.");

        var roleValue = User.FindFirstValue(ClaimTypes.Role)
            ?? User.FindFirstValue("role")
            ?? throw new UnauthorizedAccessException("Missing role claim.");

        if (!Guid.TryParse(userIdValue, out var userId))
        {
            throw new UnauthorizedAccessException("User id claim is not a valid GUID.");
        }

        if (!Enum.TryParse<UserRole>(roleValue, ignoreCase: true, out var role))
        {
            throw new UnauthorizedAccessException("Role claim is not valid.");
        }

        return new UserContext(
            userId,
            role,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers["User-Agent"].ToString());
    }
}

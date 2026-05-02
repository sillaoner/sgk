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
        _ = await this.BuildValidatedUserContextAsync(_db, cancellationToken);

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
        var actor = await this.BuildValidatedUserContextAsync(_db, cancellationToken);
        var result = await _analysisService.UpsertAnalysisAsync(incidentId, request, actor, cancellationToken);
        return Ok(result);
    }

    [HttpPost("analyses/{analysisId:guid}/actions")]
    [Authorize(Roles = "ohs")]
    public async Task<ActionResult<ActionDto>> CreateAction(
        Guid analysisId,
        [FromBody] CreateActionRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await this.BuildValidatedUserContextAsync(_db, cancellationToken);
        var result = await _analysisService.CreateActionAsync(analysisId, request, actor, cancellationToken);
        return Ok(result);
    }

    [HttpPost("actions/{actionId:guid}/complete")]
    [Authorize(Roles = "supervisor,manager,ohs,hr")]
    public async Task<ActionResult<ActionDto>> CompleteAction(
        Guid actionId,
        CancellationToken cancellationToken)
    {
        var actor = await this.BuildValidatedUserContextAsync(_db, cancellationToken);
        var result = await _analysisService.MarkActionCompletedAsync(actionId, actor, cancellationToken);
        return Ok(result);
    }

    [HttpPost("actions/{actionId:guid}/approve")]
    [Authorize(Roles = "ohs")]
    public async Task<ActionResult<ActionDto>> ApproveAction(
        Guid actionId,
        CancellationToken cancellationToken)
    {
        var actor = await this.BuildValidatedUserContextAsync(_db, cancellationToken);
        var result = await _analysisService.ApproveActionCompletionAsync(actionId, actor, cancellationToken);
        return Ok(result);
    }

    [HttpPost("incidents/{incidentId:guid}/close")]
    [Authorize(Roles = "ohs")]
    public async Task<IActionResult> CloseIncident(Guid incidentId, CancellationToken cancellationToken)
    {
        var actor = await this.BuildValidatedUserContextAsync(_db, cancellationToken);
        await _analysisService.CloseIncidentIfReadyAsync(incidentId, actor, cancellationToken);
        return NoContent();
    }
}

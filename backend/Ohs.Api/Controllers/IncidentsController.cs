using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Ohs.Api.Contracts;
using Ohs.Api.Data;
using Ohs.Api.Domain;
using Ohs.Api.Services;

namespace Ohs.Api.Controllers;

[ApiController]
[Route("api/incidents")]
[Authorize]
public sealed class IncidentsController : ControllerBase
{
    private readonly IIncidentService _incidentService;
    private readonly OhsDbContext _db;

    public IncidentsController(IIncidentService incidentService, OhsDbContext db)
    {
        _incidentService = incidentService;
        _db = db;
    }

    [HttpGet]
    [Authorize(Roles = "supervisor,ohs,manager,hr")]
    public async Task<ActionResult<IReadOnlyCollection<IncidentDto>>> ListIncidents(CancellationToken cancellationToken)
    {
        _ = await this.BuildValidatedUserContextAsync(_db, cancellationToken);

        var incidents = await _db.Incidents
            .AsNoTracking()
            .OrderByDescending(x => x.DateTime)
            .Take(500)
            .Select(x => new IncidentDto(
                x.Id,
                x.Type,
                x.DateTime,
                x.LocationId,
                x.ReporterId,
                x.Description,
                x.Status,
                x.IsDraft,
                x.PhotoUrls,
                x.CreatedAt,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);

        return Ok(incidents);
    }

    [HttpPost("drafts")]
    [Authorize(Roles = "supervisor,ohs,manager")]
    public async Task<ActionResult<IncidentDto>> StartDraft(
        [FromBody] CreateIncidentDraftRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequest(new { error = "Request body is required." });
        }

        if (!Enum.IsDefined(request.Type))
        {
            return BadRequest(new { error = "Type must be a valid enum name (NearMiss or Accident)." });
        }

        if (request.OccurredAt == default)
        {
            return BadRequest(new { error = "Date / Time is required." });
        }

        var actor = await this.BuildValidatedUserContextAsync(_db, cancellationToken);
        var result = await _incidentService.StartDraftAsync(request, actor, cancellationToken);
        return Created($"/api/incidents/drafts/{result.Id}", result);
    }

    [HttpPut("drafts/{incidentId:guid}/details")]
    [Authorize(Roles = "supervisor,ohs,manager")]
    public async Task<ActionResult<IncidentDto>> UpdateDraftDetails(
        Guid incidentId,
        [FromBody] UpdateIncidentDetailsRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await this.BuildValidatedUserContextAsync(_db, cancellationToken);
        var result = await _incidentService.UpdateDraftDetailsAsync(incidentId, request, actor, cancellationToken);
        return Ok(result);
    }

    [HttpPut("drafts/{incidentId:guid}/photos")]
    [Authorize(Roles = "supervisor,ohs,manager")]
    public async Task<ActionResult<IncidentDto>> AddDraftPhotos(
        Guid incidentId,
        [FromBody] AddIncidentPhotosRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await this.BuildValidatedUserContextAsync(_db, cancellationToken);
        var result = await _incidentService.AddDraftPhotosAsync(incidentId, request, actor, cancellationToken);
        return Ok(result);
    }

    [HttpPost("drafts/{incidentId:guid}/submit")]
    [Authorize(Roles = "supervisor,ohs,manager")]
    public async Task<ActionResult<IncidentDto>> SubmitDraft(Guid incidentId, CancellationToken cancellationToken)
    {
        var actor = await this.BuildValidatedUserContextAsync(_db, cancellationToken);
        var result = await _incidentService.SubmitDraftAsync(incidentId, actor, cancellationToken);
        return Ok(result);
    }

    [HttpPut("{incidentId:guid}/status")]
    [Authorize(Roles = "supervisor,ohs,manager")]
    public async Task<ActionResult<IncidentDto>> UpdateIncidentStatus(
        Guid incidentId,
        [FromBody] UpdateIncidentStatusRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { error = "Status is required." });
        }

        if (!TryParseIncidentStatus(request.Status, out var parsedStatus))
        {
            return BadRequest(new { error = "Status must be one of: Open, Analysis, Closed." });
        }

        var actor = await this.BuildValidatedUserContextAsync(_db, cancellationToken);
        var result = await _incidentService.UpdateIncidentAsync(
            incidentId,
            new UpdateIncidentRequest { Status = parsedStatus },
            actor,
            cancellationToken);

        return Ok(result);
    }

    [HttpPut("{incidentId:guid}")]
    [Authorize(Roles = "supervisor,ohs,manager")]
    public async Task<ActionResult<IncidentDto>> UpdateIncident(
        Guid incidentId,
        [FromBody] UpdateIncidentApiRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequest(new { error = "Request body is required." });
        }

        IncidentStatus? parsedStatus = null;
        if (request.Status is not null)
        {
            if (!TryParseIncidentStatus(request.Status, out var status))
            {
                return BadRequest(new { error = "Status must be one of: Open, Analysis, Closed." });
            }

            parsedStatus = status;
        }

        var actor = await this.BuildValidatedUserContextAsync(_db, cancellationToken);
        var result = await _incidentService.UpdateIncidentAsync(
            incidentId,
            new UpdateIncidentRequest
            {
                Description = request.Description,
                Status = parsedStatus
            },
            actor,
            cancellationToken);

        return Ok(result);
    }

    private static bool TryParseIncidentStatus(string rawStatus, out IncidentStatus status)
    {
        status = default;

        return Enum.TryParse(rawStatus, ignoreCase: false, out status)
            && Enum.IsDefined(status);
    }
}

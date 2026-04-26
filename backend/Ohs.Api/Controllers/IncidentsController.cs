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
        [FromBody] CreateIncidentDraftRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _incidentService.StartDraftAsync(request, BuildUserContext(), cancellationToken);
        return Created($"/api/incidents/drafts/{result.Id}", result);
    }

    [HttpPut("drafts/{incidentId:guid}/details")]
    [Authorize(Roles = "supervisor,ohs,manager")]
    public async Task<ActionResult<IncidentDto>> UpdateDraftDetails(
        Guid incidentId,
        [FromBody] UpdateIncidentDetailsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _incidentService.UpdateDraftDetailsAsync(incidentId, request, BuildUserContext(), cancellationToken);
        return Ok(result);
    }

    [HttpPut("drafts/{incidentId:guid}/photos")]
    [Authorize(Roles = "supervisor,ohs,manager")]
    public async Task<ActionResult<IncidentDto>> AddDraftPhotos(
        Guid incidentId,
        [FromBody] AddIncidentPhotosRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _incidentService.AddDraftPhotosAsync(incidentId, request, BuildUserContext(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("drafts/{incidentId:guid}/submit")]
    [Authorize(Roles = "supervisor,ohs,manager")]
    public async Task<ActionResult<IncidentDto>> SubmitDraft(Guid incidentId, CancellationToken cancellationToken)
    {
        var result = await _incidentService.SubmitDraftAsync(incidentId, BuildUserContext(), cancellationToken);
        return Ok(result);
    }

    [HttpPut("{incidentId:guid}")]
    [Authorize(Roles = "supervisor,ohs,manager")]
    public async Task<ActionResult<IncidentDto>> UpdateIncident(
        Guid incidentId,
        [FromBody] UpdateIncidentRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _incidentService.UpdateIncidentAsync(incidentId, request, BuildUserContext(), cancellationToken);
        return Ok(result);
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

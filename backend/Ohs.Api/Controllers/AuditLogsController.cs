using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ohs.Api.Data;

namespace Ohs.Api.Controllers;

[ApiController]
[Authorize(Roles = "ohs,manager")]
[Route("api/audit-logs")]
public sealed class AuditLogsController : ControllerBase
{
    private readonly OhsDbContext _db;

    public AuditLogsController(OhsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var logs = await _db.AccessLogs
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(1000)
            .ToListAsync(cancellationToken);

        return Ok(logs);
    }
}

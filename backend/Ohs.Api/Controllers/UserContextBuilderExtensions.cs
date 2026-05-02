using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ohs.Api.Contracts;
using Ohs.Api.Data;
using Ohs.Api.Domain;

namespace Ohs.Api.Controllers;

internal static class UserContextBuilderExtensions
{
    public static async Task<UserContext> BuildValidatedUserContextAsync(
        this ControllerBase controller,
        OhsDbContext db,
        CancellationToken cancellationToken)
    {
        var userIdValue = controller.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? controller.User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("Missing user id claim.");

        var roleValue = controller.User.FindFirstValue(ClaimTypes.Role)
            ?? controller.User.FindFirstValue("role")
            ?? throw new UnauthorizedAccessException("Missing role claim.");

        if (!Guid.TryParse(userIdValue, out var userId))
        {
            throw new UnauthorizedAccessException("User id claim is not a valid GUID.");
        }

        if (!Enum.TryParse<UserRole>(roleValue, ignoreCase: true, out var role))
        {
            throw new UnauthorizedAccessException("Role claim is not valid.");
        }

        var actorExists = await db.Users
            .AsNoTracking()
            .AnyAsync(x => x.Id == userId && x.IsActive, cancellationToken);

        if (!actorExists)
        {
            throw new UnauthorizedAccessException("Authenticated user was not found or is inactive. Please sign in again.");
        }

        return new UserContext(
            userId,
            role,
            controller.HttpContext.Connection.RemoteIpAddress?.ToString(),
            controller.Request.Headers["User-Agent"].ToString());
    }
}

using Ohs.Api.Contracts;
using Ohs.Api.Data;
using Ohs.Api.Domain;

namespace Ohs.Api.Services;

public sealed class PrivacyAuditWriter : IPrivacyAuditWriter
{
    private readonly OhsDbContext _db;

    public PrivacyAuditWriter(OhsDbContext db)
    {
        _db = db;
    }

    public async Task WriteAsync(
        UserContext actor,
        string entityType,
        Guid entityId,
        string action,
        string? reason,
        CancellationToken cancellationToken)
    {
        _db.AccessLogs.Add(new AccessLog
        {
            ActorUserId = actor.UserId,
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            Reason = reason,
            IpAddress = actor.IpAddress,
            UserAgent = actor.UserAgent,
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync(cancellationToken);
    }
}

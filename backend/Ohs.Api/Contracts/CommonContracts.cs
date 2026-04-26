using Ohs.Api.Domain;

namespace Ohs.Api.Contracts;

public sealed record UserContext(
    Guid UserId,
    UserRole Role,
    string? IpAddress,
    string? UserAgent
);

public sealed record HealthEncryptionResult(
    byte[] Ciphertext,
    byte[] Iv,
    byte[] AuthTag,
    int KeyVersion
);

public interface IHealthDataCrypto
{
    Task<HealthEncryptionResult> EncryptAsync(string plaintextJson, CancellationToken cancellationToken);
}

public interface IPrivacyAuditWriter
{
    Task WriteAsync(
        UserContext actor,
        string entityType,
        Guid entityId,
        string action,
        string? reason,
        CancellationToken cancellationToken);
}

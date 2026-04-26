using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Ohs.Api.Contracts;

namespace Ohs.Api.Services;

public sealed class AesGcmHealthDataCrypto : IHealthDataCrypto
{
    private readonly byte[] _key;
    private readonly int _keyVersion;

    public AesGcmHealthDataCrypto(IConfiguration configuration)
    {
        var keyBase64 = configuration["Encryption:CurrentKey"]
            ?? throw new InvalidOperationException("Encryption:CurrentKey is missing.");

        _key = Convert.FromBase64String(keyBase64);
        _keyVersion = int.TryParse(configuration["Encryption:KeyVersion"], out var parsed) ? parsed : 1;
    }

    public Task<HealthEncryptionResult> EncryptAsync(string plaintextJson, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var plaintext = Encoding.UTF8.GetBytes(plaintextJson);
        var iv = RandomNumberGenerator.GetBytes(12);
        var ciphertext = new byte[plaintext.Length];
        var authTag = new byte[16];

        using var aes = new AesGcm(_key, 16);
        aes.Encrypt(iv, plaintext, ciphertext, authTag);

        return Task.FromResult(new HealthEncryptionResult(
            Ciphertext: ciphertext,
            Iv: iv,
            AuthTag: authTag,
            KeyVersion: _keyVersion));
    }
}

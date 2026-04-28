using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
<<<<<<< HEAD
=======
using Microsoft.Extensions.Logging;
>>>>>>> abd55b3 (fixes)
using Ohs.Api.Contracts;

namespace Ohs.Api.Services;

public sealed class AesGcmHealthDataCrypto : IHealthDataCrypto
{
<<<<<<< HEAD
    private readonly byte[] _key;
    private readonly int _keyVersion;

    public AesGcmHealthDataCrypto(IConfiguration configuration)
    {
        var keyBase64 = configuration["Encryption:CurrentKey"]
            ?? throw new InvalidOperationException("Encryption:CurrentKey is missing.");

        _key = Convert.FromBase64String(keyBase64);
        _keyVersion = int.TryParse(configuration["Encryption:KeyVersion"], out var parsed) ? parsed : 1;
=======
    private readonly byte[]? _key;
    private readonly int _keyVersion;
    private readonly ILogger<AesGcmHealthDataCrypto> _logger;

    public AesGcmHealthDataCrypto(IConfiguration configuration, ILogger<AesGcmHealthDataCrypto> logger)
    {
        _logger = logger;
        var keyBase64 = configuration["Encryption:CurrentKey"];

        _keyVersion = int.TryParse(configuration["Encryption:KeyVersion"], out var parsed) ? parsed : 1;

        if (string.IsNullOrWhiteSpace(keyBase64))
        {
            _logger.LogWarning("Encryption:CurrentKey is missing. Health data encryption is disabled.");
            return;
        }

        try
        {
            var decoded = Convert.FromBase64String(keyBase64);
            if (decoded.Length is not (16 or 24 or 32))
            {
                _logger.LogWarning(
                    "Encryption:CurrentKey decoded to {KeyLength} bytes. Expected AES key lengths are 16, 24, or 32 bytes. Health data encryption is disabled.",
                    decoded.Length);
                return;
            }

            _key = decoded;
        }
        catch (FormatException)
        {
            _logger.LogWarning(
                "Encryption:CurrentKey is not valid base64. Health data encryption is disabled until a valid key is provided.");
        }
>>>>>>> abd55b3 (fixes)
    }

    public Task<HealthEncryptionResult> EncryptAsync(string plaintextJson, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

<<<<<<< HEAD
=======
        if (_key is null)
        {
            throw new DomainException(
                "Health data encryption key is not configured correctly. Please set a valid base64 Encryption:CurrentKey.");
        }

>>>>>>> abd55b3 (fixes)
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

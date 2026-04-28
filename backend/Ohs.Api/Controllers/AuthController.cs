using System.IdentityModel.Tokens.Jwt;
using Claims = System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Ohs.Api.Contracts;
using Ohs.Api.Data;

namespace Ohs.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly OhsDbContext _db;
    private readonly IConfiguration _configuration;

    public AuthController(OhsDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Unauthorized(new { error = "Invalid credentials." });
        }

        var username = request.Username.Trim();

        var user = await _db.Users
            .AsNoTracking()
            .Include(x => x.Department)
            .SingleOrDefaultAsync(
                x => (x.Email != null && x.Email == username) || x.Phone == username,
                cancellationToken);

        if (user is null || !user.IsActive)
        {
            return Unauthorized(new { error = "Invalid credentials." });
        }

        var expectedPassword = _configuration["Auth:DemoPassword"];
        if (string.IsNullOrWhiteSpace(expectedPassword) || request.Password != expectedPassword)
        {
            return Unauthorized(new { error = "Invalid credentials." });
        }

        var issuer = _configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Jwt:Issuer is missing.");
        var audience = _configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Jwt:Audience is missing.");
<<<<<<< HEAD
        var key = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is missing.");
        if (key.Length < 32)
        {
            throw new InvalidOperationException("Jwt:Key must be at least 32 characters (256 bits).");
=======
        var key = _configuration["Jwt:SigningKey"] ?? throw new InvalidOperationException("Jwt:SigningKey is missing.");
        if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
        {
            throw new InvalidOperationException("Jwt:SigningKey must be at least 32 characters (256 bits).");
>>>>>>> abd55b3 (fixes)
        }

        var roleValue = user.Role.ToString().ToLowerInvariant();
        var claims = new[]
        {
            new Claims.Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claims.Claim(Claims.ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claims.Claim(Claims.ClaimTypes.Role, roleValue),
            new Claims.Claim("role", roleValue),
            new Claims.Claim("name", user.FullName)
        };

        var expires = DateTimeOffset.UtcNow.AddHours(8);
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expires.UtcDateTime,
            signingCredentials: credentials);

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);

        return Ok(new LoginResponse(
            AccessToken: accessToken,
            ExpiresIn: 8L * 60 * 60,
            User: new LoginUserDto(
                user.Id,
                user.FullName,
                roleValue,
                user.Department?.Name)));
    }
}

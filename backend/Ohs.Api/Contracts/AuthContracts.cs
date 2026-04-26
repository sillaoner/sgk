namespace Ohs.Api.Contracts;

public sealed record LoginRequest(string Username, string Password);

public sealed record LoginResponse(
    string AccessToken,
    long ExpiresIn,
    LoginUserDto User
);

public sealed record LoginUserDto(
    Guid Id,
    string FullName,
    string Role,
    string? DepartmentName
);

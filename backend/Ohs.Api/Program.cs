using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Ohs.Api.Contracts;
using Ohs.Api.Data;
using Ohs.Api.Domain;
using Ohs.Api.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        var allowedOrigin = builder.Configuration["Frontend:AllowedOrigin"] ?? "http://localhost:3000";
        policy.WithOrigins(allowedOrigin)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var postgresConnectionString = builder.Configuration.GetConnectionString("PostgreSql")
    ?? throw new InvalidOperationException("ConnectionStrings:PostgreSql is missing.");

var dataSourceBuilder = new NpgsqlDataSourceBuilder(postgresConnectionString);
dataSourceBuilder.MapEnum<UserRole>("user_role");
dataSourceBuilder.MapEnum<IncidentType>("incident_type");
dataSourceBuilder.MapEnum<IncidentStatus>("incident_status");
dataSourceBuilder.MapEnum<AnalysisCategory>("analysis_category");
dataSourceBuilder.MapEnum<ActionStatus>("action_status");
dataSourceBuilder.MapEnum<LegalReportType>("legal_report_type");
var dataSource = dataSourceBuilder.Build();

builder.Services.AddSingleton(dataSource);
builder.Services.AddDbContext<OhsDbContext>(options =>
    options.UseNpgsql(dataSource)
        .UseSnakeCaseNamingConvention());

builder.Services.AddScoped<IIncidentService, IncidentService>();
builder.Services.AddScoped<IAnalysisService, AnalysisService>();
builder.Services.AddScoped<IHealthDataCrypto, AesGcmHealthDataCrypto>();
builder.Services.AddScoped<IPrivacyAuditWriter, PrivacyAuditWriter>();

<<<<<<< HEAD
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is missing.");

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("Jwt:Key is empty.");
=======
var jwtKey = builder.Configuration["Jwt:SigningKey"]
    ?? throw new InvalidOperationException("Jwt:SigningKey is missing.");

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("Jwt:SigningKey is empty.");
>>>>>>> abd55b3 (fixes)
}

if (jwtKey.Length < 32)
{
<<<<<<< HEAD
    throw new InvalidOperationException($"Jwt:Key must be at least 32 characters (256 bits). Current length: {jwtKey.Length}.");
=======
    throw new InvalidOperationException($"Jwt:SigningKey must be at least 32 characters (256 bits). Current length: {jwtKey.Length}.");
>>>>>>> abd55b3 (fixes)
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<OhsDbContext>();
<<<<<<< HEAD
    await db.Database.EnsureCreatedAsync();
=======
    var migrations = db.Database.GetMigrations().ToList();

    await db.Database.CanConnectAsync();

    if (migrations.Count > 0)
    {
        app.Logger.LogInformation("Applying {Count} database migrations at startup.", migrations.Count);
        db.Database.Migrate();
    }
    else
    {
        await db.Database.EnsureCreatedAsync();
    }

    await DatabaseStartupValidator.ValidateAsync(db, app.Logger, CancellationToken.None);
>>>>>>> abd55b3 (fixes)

    if (app.Environment.IsDevelopment())
    {
        await DevelopmentSeed.EnsureSeedAsync(db, CancellationToken.None);
    }
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
<<<<<<< HEAD
=======
        var traceId = context.TraceIdentifier;

        if (exception is not null)
        {
            app.Logger.LogError(exception, "Unhandled exception for {Method} {Path}. TraceId: {TraceId}",
                context.Request.Method,
                context.Request.Path,
                traceId);
        }
>>>>>>> abd55b3 (fixes)

        if (exception is DomainException domainException)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
<<<<<<< HEAD
            await context.Response.WriteAsJsonAsync(new { error = domainException.Message });
=======
            await context.Response.WriteAsJsonAsync(new { error = domainException.Message, traceId });
            return;
        }

        if (exception is UnauthorizedAccessException unauthorizedException)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = unauthorizedException.Message, traceId });
            return;
        }

        if (exception is PostgresException postgresException)
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;

            var message = app.Environment.IsDevelopment()
                ? $"Database error ({postgresException.SqlState}): {postgresException.MessageText}"
                : "Database operation failed.";

            await context.Response.WriteAsJsonAsync(new { error = message, traceId });
>>>>>>> abd55b3 (fixes)
            return;
        }

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
<<<<<<< HEAD
        await context.Response.WriteAsJsonAsync(new { error = "An unexpected error occurred." });
=======
        await context.Response.WriteAsJsonAsync(new { error = "An unexpected error occurred.", traceId });
>>>>>>> abd55b3 (fixes)
    });
});

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

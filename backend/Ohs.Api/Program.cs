using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Ohs.Api.Contracts;
using Ohs.Api.Data;
using Ohs.Api.Domain;
using Ohs.Api.Services;
using System.Reflection;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();
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

var jwtKey = builder.Configuration["Jwt:SigningKey"]
    ?? throw new InvalidOperationException("Jwt:SigningKey is missing.");

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("Jwt:SigningKey is empty.");
}

if (jwtKey.Length < 32)
{
    throw new InvalidOperationException($"Jwt:SigningKey must be at least 32 characters (256 bits). Current length: {jwtKey.Length}.");
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
var entryAssemblyName = Assembly.GetEntryAssembly()?.GetName().Name;
var isEfDesignTime = string.Equals(entryAssemblyName, "ef", StringComparison.OrdinalIgnoreCase)
    || string.Equals(entryAssemblyName, "dotnet-ef", StringComparison.OrdinalIgnoreCase)
    || AppDomain.CurrentDomain.GetAssemblies()
        .Any(a => string.Equals(a.GetName().Name, "Microsoft.EntityFrameworkCore.Design", StringComparison.Ordinal));

if (!isEfDesignTime)
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<OhsDbContext>();
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
            var traceId = context.TraceIdentifier;

            if (exception is not null)
            {
                app.Logger.LogError(exception, "Unhandled exception for {Method} {Path}. TraceId: {TraceId}",
                    context.Request.Method,
                    context.Request.Path,
                    traceId);
            }
            var (statusCode, title, detail) = exception switch
            {
                DomainException domainException => (
                    StatusCodes.Status400BadRequest,
                    "Bad Request",
                    domainException.Message),
                UnauthorizedAccessException unauthorizedException => (
                    StatusCodes.Status401Unauthorized,
                    "Unauthorized",
                    unauthorizedException.Message),
                KeyNotFoundException notFoundException => (
                    StatusCodes.Status404NotFound,
                    "Not Found",
                    notFoundException.Message),
                PostgresException postgresException when
                    postgresException.SqlState == PostgresErrorCodes.ForeignKeyViolation ||
                    postgresException.SqlState == PostgresErrorCodes.CheckViolation ||
                    postgresException.SqlState == PostgresErrorCodes.NotNullViolation => (
                    StatusCodes.Status400BadRequest,
                    "Bad Request",
                    "Invalid request data."),
                DbUpdateException dbUpdateException when
                    dbUpdateException.InnerException is PostgresException updatePostgresException &&
                    (updatePostgresException.SqlState == PostgresErrorCodes.ForeignKeyViolation ||
                     updatePostgresException.SqlState == PostgresErrorCodes.CheckViolation ||
                     updatePostgresException.SqlState == PostgresErrorCodes.NotNullViolation) => (
                    StatusCodes.Status400BadRequest,
                    "Bad Request",
                    "Invalid request data."),
                DbUpdateException => (
                    StatusCodes.Status500InternalServerError,
                    "Database Update Failed",
                    "Database update failed."),
                PostgresException => (
                    StatusCodes.Status503ServiceUnavailable,
                    "Database Operation Failed",
                    "Database operation failed."),
                _ => (
                    StatusCodes.Status500InternalServerError,
                    "Internal Server Error",
                    "An unexpected error occurred.")
            };

            context.Response.StatusCode = statusCode;

            var problemDetails = new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = detail,
                Type = $"https://httpstatuses.com/{statusCode}",
                Instance = context.Request.Path
            };

            problemDetails.Extensions["traceId"] = traceId;

            await context.Response.WriteAsJsonAsync(problemDetails);
        });
    });
    
    app.UseSwagger();
    app.UseSwaggerUI();
    
    app.UseStaticFiles();
    app.UseCors("frontend");
    app.UseAuthentication();
    app.UseAuthorization();
    
    app.MapControllers();
    
    app.Run();
}

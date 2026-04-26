using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Ohs.Api.Domain;

namespace Ohs.Api.Data;

public sealed class OhsDbContext : DbContext
{
    public OhsDbContext(DbContextOptions<OhsDbContext> options) : base(options)
    {
    }

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Incident> Incidents => Set<Incident>();
    public DbSet<IncidentHealthPayload> IncidentHealthPayloads => Set<IncidentHealthPayload>();
    public DbSet<RootCauseAnalysis> RootCauseAnalyses => Set<RootCauseAnalysis>();
    public DbSet<CorrectiveAction> Actions => Set<CorrectiveAction>();
    public DbSet<LegalReport> LegalReports => Set<LegalReport>();
    public DbSet<AccessLog> AccessLogs => Set<AccessLog>();
    public DbSet<OutboxEvent> OutboxEvents => Set<OutboxEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var photoUrlsConverter = new ValueConverter<List<string>, string>(
            value => JsonSerializer.Serialize(value, (JsonSerializerOptions?)null),
            value => JsonSerializer.Deserialize<List<string>>(value, (JsonSerializerOptions?)null) ?? new List<string>());

        var photoUrlsComparer = new ValueComparer<List<string>>(
            (a, b) => JsonSerializer.Serialize(a, (JsonSerializerOptions?)null) == JsonSerializer.Serialize(b, (JsonSerializerOptions?)null),
            value => JsonSerializer.Serialize(value, (JsonSerializerOptions?)null).GetHashCode(),
            value => value.ToList());

        var jsonDocConverter = new ValueConverter<JsonDocument, string>(
            value => value.RootElement.GetRawText(),
            value => JsonDocument.Parse(string.IsNullOrWhiteSpace(value) ? "{}" : value, new JsonDocumentOptions()));

        modelBuilder.Entity<User>(builder =>
        {
            builder.ToTable("users");
            builder.Property(x => x.Role)
                .HasColumnType("user_role");
        });

        modelBuilder.Entity<Department>().ToTable("departments");
        modelBuilder.Entity<Location>().ToTable("locations");

        modelBuilder.Entity<Incident>(builder =>
        {
            builder.ToTable("incidents");
            builder.Property(x => x.Type)
                .HasColumnType("incident_type");
            builder.Property(x => x.Status)
                .HasColumnType("incident_status");
            builder.Property(x => x.PhotoUrls)
                .HasConversion(photoUrlsConverter)
                .Metadata.SetValueComparer(photoUrlsComparer);
            builder.Property(x => x.PhotoUrls).HasColumnType("jsonb");
            builder.HasOne(x => x.HealthPayload)
                .WithOne(x => x.Incident)
                .HasForeignKey<IncidentHealthPayload>(x => x.IncidentId);
        });

        modelBuilder.Entity<IncidentHealthPayload>(builder =>
        {
            builder.ToTable("incident_health_payloads");
            builder.HasKey(x => x.IncidentId);
        });

        modelBuilder.Entity<RootCauseAnalysis>(builder =>
        {
            builder.ToTable("root_cause_analyses");
            builder.Property(x => x.Category)
                .HasColumnType("analysis_category");
            builder.Property(x => x.FishboneJson).HasConversion(jsonDocConverter);
            builder.Property(x => x.FishboneJson).HasColumnType("jsonb");
            builder.HasOne(x => x.Incident)
                .WithOne(x => x.RootCauseAnalysis)
                .HasForeignKey<RootCauseAnalysis>(x => x.IncidentId);
        });

        modelBuilder.Entity<CorrectiveAction>(builder =>
        {
            builder.ToTable("actions");
            builder.Property(x => x.Status)
                .HasColumnType("action_status");
            builder.HasOne(x => x.Analysis)
                .WithMany(x => x.Actions)
                .HasForeignKey(x => x.AnalysisId);
        });

        modelBuilder.Entity<LegalReport>(builder =>
        {
            builder.ToTable("legal_reports");
            builder.Property(x => x.Type)
                .HasColumnType("legal_report_type");
        });

        modelBuilder.Entity<AccessLog>().ToTable("access_logs");

        modelBuilder.Entity<OutboxEvent>(builder =>
        {
            builder.ToTable("outbox_events");
            builder.Property(x => x.Payload).HasConversion(jsonDocConverter);
            builder.Property(x => x.Payload).HasColumnType("jsonb");
        });
    }

}

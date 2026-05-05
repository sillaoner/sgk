using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using NpgsqlTypes;

#nullable disable

namespace Ohs.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "access_logs",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    entity_type = table.Column<string>(type: "text", nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action = table.Column<string>(type: "text", nullable: false),
                    reason = table.Column<string>(type: "text", nullable: true),
                    ip_address = table.Column<string>(type: "text", nullable: true),
                    user_agent = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_access_logs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "departments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_departments", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "legal_reports",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<int>(type: "legal_report_type", nullable: false),
                    period = table.Column<NpgsqlRange<DateOnly>>(type: "daterange", nullable: false),
                    pdf_url = table.Column<string>(type: "text", nullable: false),
                    generated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    generated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_legal_reports", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "locations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    site_name = table.Column<string>(type: "text", nullable: false),
                    building = table.Column<string>(type: "text", nullable: true),
                    line_name = table.Column<string>(type: "text", nullable: true),
                    floor = table.Column<string>(type: "text", nullable: true),
                    area_code = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_locations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    aggregate_type = table.Column<string>(type: "text", nullable: false),
                    aggregate_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_type = table.Column<string>(type: "text", nullable: false),
                    payload = table.Column<string>(type: "jsonb", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    published_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    retry_count = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_outbox_events", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    full_name = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<int>(type: "user_role", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: true),
                    phone = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                    table.ForeignKey(
                        name: "fk_users_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "incidents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<int>(type: "incident_type", nullable: false),
                    date_time = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    reporter_id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_id = table.Column<Guid>(type: "uuid", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<int>(type: "incident_status", nullable: false),
                    photo_urls = table.Column<string>(type: "jsonb", nullable: false),
                    is_draft = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_incidents", x => x.id);
                    table.ForeignKey(
                        name: "fk_incidents_locations_location_id",
                        column: x => x.location_id,
                        principalTable: "locations",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_incidents_users_reporter_id",
                        column: x => x.reporter_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "incident_health_payloads",
                columns: table => new
                {
                    incident_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ciphertext = table.Column<byte[]>(type: "bytea", nullable: false),
                    iv = table.Column<byte[]>(type: "bytea", nullable: false),
                    auth_tag = table.Column<byte[]>(type: "bytea", nullable: false),
                    key_version = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_incident_health_payloads", x => x.incident_id);
                    table.ForeignKey(
                        name: "fk_incident_health_payloads_incidents_incident_id",
                        column: x => x.incident_id,
                        principalTable: "incidents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "root_cause_analyses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    incident_id = table.Column<Guid>(type: "uuid", nullable: false),
                    cause_1 = table.Column<string>(type: "text", nullable: false),
                    cause_2 = table.Column<string>(type: "text", nullable: true),
                    cause_3 = table.Column<string>(type: "text", nullable: true),
                    cause_4 = table.Column<string>(type: "text", nullable: true),
                    cause_5 = table.Column<string>(type: "text", nullable: true),
                    category = table.Column<int>(type: "analysis_category", nullable: false),
                    fishbone_json = table.Column<string>(type: "jsonb", nullable: false),
                    analyst_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_root_cause_analyses", x => x.id);
                    table.ForeignKey(
                        name: "fk_root_cause_analyses_incidents_incident_id",
                        column: x => x.incident_id,
                        principalTable: "incidents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_root_cause_analyses_users_analyst_id",
                        column: x => x.analyst_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "actions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    analysis_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    responsible_id = table.Column<Guid>(type: "uuid", nullable: false),
                    end_date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<int>(type: "action_status", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    completed_by = table.Column<Guid>(type: "uuid", nullable: true),
                    ohs_approval_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ohs_approved_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_actions", x => x.id);
                    table.ForeignKey(
                        name: "fk_actions_root_cause_analyses_analysis_id",
                        column: x => x.analysis_id,
                        principalTable: "root_cause_analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_actions_users_responsible_id",
                        column: x => x.responsible_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_actions_analysis_id",
                table: "actions",
                column: "analysis_id");

            migrationBuilder.CreateIndex(
                name: "ix_actions_responsible_id",
                table: "actions",
                column: "responsible_id");

            migrationBuilder.CreateIndex(
                name: "ix_incidents_location_id",
                table: "incidents",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "ix_incidents_reporter_id",
                table: "incidents",
                column: "reporter_id");

            migrationBuilder.CreateIndex(
                name: "ix_root_cause_analyses_analyst_id",
                table: "root_cause_analyses",
                column: "analyst_id");

            migrationBuilder.CreateIndex(
                name: "ix_root_cause_analyses_incident_id",
                table: "root_cause_analyses",
                column: "incident_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_department_id",
                table: "users",
                column: "department_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "access_logs");

            migrationBuilder.DropTable(
                name: "actions");

            migrationBuilder.DropTable(
                name: "incident_health_payloads");

            migrationBuilder.DropTable(
                name: "legal_reports");

            migrationBuilder.DropTable(
                name: "outbox_events");

            migrationBuilder.DropTable(
                name: "root_cause_analyses");

            migrationBuilder.DropTable(
                name: "incidents");

            migrationBuilder.DropTable(
                name: "locations");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "departments");
        }
    }
}

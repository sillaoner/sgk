using Microsoft.EntityFrameworkCore;

namespace Ohs.Api.Data;

public static class DatabaseStartupValidator
{
    public static async Task ValidateAsync(OhsDbContext db, ILogger logger, CancellationToken cancellationToken)
    {
        var incidentsTableExists = await db.Database
            .SqlQueryRaw<bool>(
                """
                SELECT EXISTS (
                  SELECT 1
                  FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'incidents'
                ) AS "Value"
                """)
            .SingleAsync(cancellationToken);

        if (!incidentsTableExists)
        {
            throw new InvalidOperationException(
                "Database schema is incomplete: 'incidents' table does not exist.");
        }

        var requiredAnalysisColumns = new[] { "cause_1", "cause_2", "cause_3", "cause_4", "cause_5" };

        var missingColumns = new List<string>();
        foreach (var column in requiredAnalysisColumns)
        {
            var exists = await db.Database
                .SqlQuery<bool>(
                    $"""
                    SELECT EXISTS (
                      SELECT 1
                      FROM information_schema.columns
                      WHERE table_schema = 'public'
                        AND table_name = 'root_cause_analyses'
                        AND column_name = {column}
                    ) AS "Value"
                    """)
                .SingleAsync(cancellationToken);

            if (!exists)
            {
                missingColumns.Add(column);
            }
        }

        if (missingColumns.Count > 0)
        {
            throw new InvalidOperationException(
                $"Database schema mismatch detected for 'root_cause_analyses'. Missing columns: {string.Join(", ", missingColumns)}.");
        }

        logger.LogInformation(
            "Database schema validation passed. Required tables and columns are available.");
    }
}

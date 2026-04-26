using Microsoft.EntityFrameworkCore;
using Ohs.Api.Domain;

namespace Ohs.Api.Data;

public static class DevelopmentSeed
{
    public static async Task EnsureSeedAsync(OhsDbContext db, CancellationToken cancellationToken)
    {
        if (!await db.Departments.AnyAsync(cancellationToken))
        {
            db.Departments.AddRange(
                new Department { Id = Guid.NewGuid(), Name = "Production" },
                new Department { Id = Guid.NewGuid(), Name = "Safety" },
                new Department { Id = Guid.NewGuid(), Name = "HR" });
            await db.SaveChangesAsync(cancellationToken);
        }

        if (!await db.Locations.AnyAsync(cancellationToken))
        {
            db.Locations.Add(new Location
            {
                Id = Guid.NewGuid(),
                SiteName = "MetalForm Plant",
                Building = "A",
                LineName = "Press Line",
                Floor = "1",
                AreaCode = "PR-1"
            });
            await db.SaveChangesAsync(cancellationToken);
        }

        if (!await db.Users.AnyAsync(cancellationToken))
        {
            var departments = await db.Departments.AsNoTracking().ToListAsync(cancellationToken);
            var productionId = departments.First(x => x.Name == "Production").Id;
            var safetyId = departments.First(x => x.Name == "Safety").Id;
            var hrId = departments.First(x => x.Name == "HR").Id;

            db.Users.AddRange(
                new User
                {
                    Id = Guid.NewGuid(),
                    FullName = "Ayse OHS",
                    Role = UserRole.Ohs,
                    DepartmentId = safetyId,
                    Phone = "+905301000001",
                    Email = "ohs@metalform.local",
                    IsActive = true
                },
                new User
                {
                    Id = Guid.NewGuid(),
                    FullName = "Mehmet Supervisor",
                    Role = UserRole.Supervisor,
                    DepartmentId = productionId,
                    Phone = "+905301000002",
                    Email = "supervisor@metalform.local",
                    IsActive = true
                },
                new User
                {
                    Id = Guid.NewGuid(),
                    FullName = "Elif Manager",
                    Role = UserRole.Manager,
                    DepartmentId = productionId,
                    Phone = "+905301000003",
                    Email = "manager@metalform.local",
                    IsActive = true
                },
                new User
                {
                    Id = Guid.NewGuid(),
                    FullName = "Can HR",
                    Role = UserRole.Hr,
                    DepartmentId = hrId,
                    Phone = "+905301000004",
                    Email = "hr@metalform.local",
                    IsActive = true
                });

            await db.SaveChangesAsync(cancellationToken);
        }
    }
}

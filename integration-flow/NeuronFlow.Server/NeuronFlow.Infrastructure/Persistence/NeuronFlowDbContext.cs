using NeuronFlow.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace NeuronFlow.Infrastructure.Persistence
{
    public class NeuronFlowDbContext : IdentityDbContext<ApplicationUser>
    {
        public NeuronFlowDbContext(DbContextOptions<NeuronFlowDbContext> options)
            : base(options)
        {
        }

        public DbSet<Project> Projects { get; set; }
        public DbSet<Connection> Connections { get; set; }

    }
}

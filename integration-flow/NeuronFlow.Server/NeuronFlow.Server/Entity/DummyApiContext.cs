using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

namespace NeuronFlow.Server.Entity
{
    public class DummyApiContext : DbContext
    {
        public DummyApiContext(DbContextOptions<DummyApiContext> options) : base(options)
        {
        }

        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<Customer> Customers { get; set; }
    }
}

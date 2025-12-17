using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using NeuronFlow.Domain.Entities;

namespace NeuronFlow.Infrastructure.Persistence
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(IServiceProvider serviceProvider)
        {
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();

            // 1. Define the Admin User
            var adminEmail = "admin@neuronflow.com";
            var adminUser = await userManager.FindByEmailAsync(adminEmail);

            if (adminUser == null)
            {
                adminUser = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    FullName = "System Administrator",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    EmailConfirmed = true
                };

                // 2. Create the User with a default password
                // Change "Admin@123" to a secure password of your choice
                var result = await userManager.CreateAsync(adminUser, "Admin@123");

                if (!result.Succeeded)
                {
                    throw new Exception($"Failed to seed admin user: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                }
            }
        }
    }
}
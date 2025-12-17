using Microsoft.Extensions.DependencyInjection;
using NeuronFlow.Domain.Interfaces;

namespace NeuronFlow.Infrastructure.DependencyInjection
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services)
        {
            // 1. Authentication
            services.AddScoped<IAuthService, AuthService>();

            return services;
        }
    }
}

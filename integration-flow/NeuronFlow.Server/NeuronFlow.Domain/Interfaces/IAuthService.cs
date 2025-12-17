using NeuronFlow.Application.DTOs.Auth;

namespace NeuronFlow.Domain.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponse> Login(LoginRequest request);
        Task<string> Register(RegisterRequest request);
        Task<AuthResponse> RefreshToken(RefreshTokenRequest request);
        Task Logout(string userId);
        Task<UserProfileDto> GetUserProfile(string userId);
    }
}

namespace NeuronFlow.Server.Service
{
    public interface IOpenAiService
    {
        Task<string> GetChatCompletionAsync(string prompt);
    }
}

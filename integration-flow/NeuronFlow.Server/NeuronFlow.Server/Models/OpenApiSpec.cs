namespace NeuronFlow.Server.Models
{
    public class OpenApiSpec
    {
        public string Url { get; set; }
    }

    public class PropertyDetail
    {
        public string Type { get; set; }
        public string Format { get; set; }
        public string Nullable { get; set; }
    }
}

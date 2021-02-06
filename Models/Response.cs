using System.Text.Json.Serialization;

namespace ARMExplorer.Models
{
    public class Response<T>
    {
        [JsonPropertyName("value")]
        public T[] Value { get; set; }

        [JsonPropertyName("nextLink")]
        public string NextLink { get; set; }
    }
}
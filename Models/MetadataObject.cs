using System.Collections.Generic;

namespace ARMExplorer.Models
{
    public class MetadataObject
    {
        public MetadataObject() { }

        public MetadataObject(MetadataObject copy)
        {
            foreach (var property in GetType().GetProperties())
            {
                property.SetValue(this, copy.GetType().GetProperty(property.Name).GetValue(copy));
            }
        }

        public string MethodName { get; set; }

        public dynamic MethodDoc { get; set; }

        public string HttpMethod { get; set; }

        public string Url { get; set; }

        public dynamic RequestBody { get; set; }

        public dynamic RequestBodyDoc { get; set; }

        public dynamic ResponseBody { get; set; }

        public dynamic ResponseBodyDoc { get; set; }

        public string ApiVersion { get; set; }

        public IEnumerable<string> Query { get; set; }
    }
}
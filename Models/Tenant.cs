namespace ARMExplorer.Models
{
    public class Tenant : Resource
    {
        public string tenantId { get; set; }
        public string countryCode { get; set; }
        public string displayName { get; set; }
        public string[] domains { get; set; }
        public string tenantCategory { get; set; }
        public string defaultDomain { get; set; }
        public string tenantType { get; set; }
    }
}
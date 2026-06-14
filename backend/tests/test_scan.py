import unittest

from backend.main import calculate_score
from backend.models import SourceFile
from backend.scanner.scan import scan_files


DEMO_CODE = """export async function GET(req: Request) {
  const apiKey = "sk-demo-hardcoded-key";

  const patient = {
    name: "Rahul Sharma",
    phone: "9876543210",
    diagnosis: "diabetes"
  };

  console.log("Patient data:", patient);

  const query = "SELECT * FROM patients WHERE id = " + req.url;

  cookies().set("session", "abc123");

  return Response.json(patient, {
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  });
}"""


class ScanFilesTest(unittest.TestCase):
    def test_demo_code_triggers_all_core_rules(self) -> None:
        findings = scan_files(
            [
                SourceFile(
                    path="demo-vulnerable-repo/patient-export.ts",
                    content=DEMO_CODE,
                )
            ]
        )

        self.assertEqual(
            {finding.ruleId for finding in findings},
            {"RULE-001", "RULE-002", "RULE-003", "RULE-004", "RULE-005", "RULE-006"},
        )
        self.assertEqual(calculate_score(findings), 1)

    def test_python_secret_key_literal_is_flagged(self) -> None:
        findings = scan_files(
            [
                SourceFile(
                    path="settings.py",
                    content='SECRET_KEY = "hxjsskdkjdkjdkjdkddkdjkdjkj"',
                )
            ]
        )

        self.assertEqual([finding.ruleId for finding in findings], ["RULE-001"])
        self.assertEqual(findings[0].severity, "Critical")

    def test_environment_secret_lookup_is_not_flagged(self) -> None:
        findings = scan_files(
            [
                SourceFile(
                    path="settings.py",
                    content='SECRET_KEY = os.getenv("SECRET_KEY")',
                )
            ]
        )

        self.assertEqual(findings, [])


if __name__ == "__main__":
    unittest.main()

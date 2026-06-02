import { FamilyForm } from "@/components/family/FamilyForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewFamilyPage() {
  return (
    <Card className="max-w-xl rounded-lg">
      <CardHeader>
        <CardTitle>创建家庭</CardTitle>
      </CardHeader>
      <CardContent>
        <FamilyForm />
      </CardContent>
    </Card>
  );
}

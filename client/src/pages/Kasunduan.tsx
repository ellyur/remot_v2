import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { FileText } from "lucide-react";
import { format } from "date-fns";

export default function Kasunduan() {
  const [agreed, setAgreed] = useState(false);
  const { tenant } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/kasunduan/accept", { tenantId: tenant?.id });
    },
    onSuccess: () => {
      toast({
        title: "Agreement Accepted",
        description: "You can now access your dashboard",
      });
      setLocation("/tenant");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    if (!agreed) return;
    acceptMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Kasunduan ng Pagpapaupa</CardTitle>
          <CardDescription>Rental Agreement - Please read carefully and accept to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScrollArea className="h-96 w-full border rounded-lg p-6 bg-muted/30">
            <div className="prose prose-sm max-w-none space-y-4">
              <h3 className="text-lg font-semibold">KASUNDUAN NG PAGPAPAUPA</h3>
              
              <p>
                Ang kasulatang ito ay ginawa at nilagdaan ngayong {format(new Date(), "MMMM dd, yyyy")} sa pagitan ng:
              </p>

              <p className="font-semibold">MAY-ARI NG BAHAY / LANDLORD:</p>
              <p>RETMOT Property Management</p>

              <p className="font-semibold">AT</p>

              <p className="font-semibold">NANGUNGUPAHAN / TENANT:</p>
              <p>{tenant?.fullName || "[Tenant Name]"}, Unit {tenant?.unitId || "[Unit ID]"}</p>

              <h4 className="font-semibold mt-4">I. LAYUNIN</h4>
              <p>
                Ang kasulatang ito ay naglalaman ng mga tuntunin at kondisyon ng pag-upa ng apartment/unit 
                na pagmamay-ari ng may-ari sa nasabing tenant.
              </p>

              <h4 className="font-semibold mt-4">II. HALAGANG BAYAD (RENT)</h4>
              <p>
                Ang buwanang upa ay nagkakahalaga ng ₱{tenant?.rentAmount || "[Rent Amount]"}. 
                Ang bayad ay dapat bayaran bawat ika-1 ng buwan.
              </p>

              <h4 className="font-semibold mt-4">III. TERMINO NG PAG-UPA</h4>
              <p>
                Ang kasunduang ito ay may bisa mula sa petsa ng pagtanggap hanggang sa susunod na abiso 
                ng alinman sa dalawang partido.
              </p>

              <h4 className="font-semibold mt-4">IV. DEPOSITO</h4>
              <p>
                Ang deposito ay katumbas ng isang (1) buwan na upa. Ito ay ibabalik sa tenant pagkatapos 
                ng kanyang paglipat, pagkatapos masuri na ang unit ay nasa mabuting kalagayan.
              </p>

              <h4 className="font-semibold mt-4">V. RESPONSIBILIDAD NG TENANT</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Panatilihing malinis at maayos ang unit</li>
                <li>Magbayad ng upa sa takdang panahon</li>
                <li>Iulat agad ang anumang sira o problema sa unit</li>
                <li>Hindi pahihintulutan ang mga aktibidad na nakakasagabal sa kapwa tenant</li>
                <li>Huwag gagawa ng mga pagbabago sa unit nang walang pahintulot</li>
              </ul>

              <h4 className="font-semibold mt-4">VI. RESPONSIBILIDAD NG MAY-ARI</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Siguraduhing ang unit ay ligtas at nakakatira</li>
                <li>Mag-ayos ng mga importanteng sira sa loob ng makatwirang panahon</li>
                <li>Respetuhin ang privacy ng tenant</li>
                <li>Magbigay ng advance notice para sa inspeksyon</li>
              </ul>

              <h4 className="font-semibold mt-4">VII. PAGTATAPOS NG KASUNDUAN</h4>
              <p>
                Ang alinman sa dalawang partido ay maaaring tapusin ang kasunduang ito sa pamamagitan ng 
                pagbibigay ng tatlumpung (30) araw na advance notice sa isa't isa.
              </p>

              <h4 className="font-semibold mt-4">VIII. IBA PANG TUNTUNIN</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Bawal ang mga alagang hayop maliban kung may nakasulat na pahintulot</li>
                <li>Ang tenant ay responsable sa kanilang mga bisita</li>
                <li>Sundin ang mga patakaran ng building/property</li>
                <li>Ang labag sa kasunduang ito ay maaaring maging sanhi ng pagtatapos nito</li>
              </ul>

              <p className="mt-6 font-semibold">
                Sa pag-click ng "I have read and agree", ikaw ay sumasang-ayon sa lahat ng mga tuntunin 
                at kondisyon na nakatala sa kasunduang ito.
              </p>
            </div>
          </ScrollArea>

          <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/30">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
              data-testid="checkbox-agree"
            />
            <label
              htmlFor="agree"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I have read and agree to the terms and conditions of this Kasunduan (Rental Agreement)
            </label>
          </div>

          <Button
            className="w-full py-6 text-lg"
            disabled={!agreed || acceptMutation.isPending}
            onClick={handleAccept}
            data-testid="button-accept"
          >
            {acceptMutation.isPending ? "Processing..." : "Accept and Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

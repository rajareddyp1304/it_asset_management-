from django import forms
from .models import Material, AssetReturn, AssetTransfer, Employee, AssetAllocation


class MaterialForm(forms.ModelForm):
    class Meta:
        model = Material

        fields = [
            "material_code",
            "material_name",
            "category",
            "brand",
            "model",
            "serial_number",
            "data_port_no",
            "processor",
            "ram",
            "storage",
            "project_manager",
            "company_name",
            "operating_system",
            "oem",
            "material_type",
            "cpu_asset_no",
            "location",
            "criticality",
            "customer_data",
            "purchase_date",
            "purchase_price",
            "vendor",
            "invoice_number",
            "po_number",
            "warranty_months",
            "condition",
            "status",
            "active",
            "remarks",
        ]

        widgets = {
            "purchase_date": forms.DateInput(
                attrs={
                    "type": "date",
                    "class": "form-control",
                }
            ),
            "remarks": forms.Textarea(
                attrs={
                    "class": "form-control",
                    "rows": 3,
                }
            ),
        }


class AssetReturnForm(forms.ModelForm):
    class Meta:
        model = AssetReturn
        fields = "__all__"


class AssetTransferForm(forms.ModelForm):
    class Meta:
        model = AssetTransfer

        fields = [
            "material",
            "from_employee",
            "to_employee",
            "transfer_date",
            "from_location",
            "to_location",
            "remarks",
        ]

        widgets = {
            "material": forms.Select(
                attrs={"class": "form-control"}
            ),
            "from_employee": forms.Select(
                attrs={"class": "form-control"}
            ),
            "to_employee": forms.Select(
                attrs={"class": "form-control"}
            ),
            "transfer_date": forms.DateInput(
                attrs={
                    "class": "form-control",
                    "type": "date",
                }
            ),
            "from_location": forms.TextInput(
                attrs={"class": "form-control"}
            ),
            "to_location": forms.TextInput(
                attrs={"class": "form-control"}
            ),
            "remarks": forms.Textarea(
                attrs={
                    "class": "form-control",
                    "rows": 3,
                }
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Only assets currently assigned can be transferred
        self.fields["material"].queryset = (
            Material.objects.filter(
                active=True,
                status="ASSIGNED",
            ).order_by("material_code")
        )

        # Active employees only
        self.fields["from_employee"].queryset = (
            Employee.objects.filter(
                status="ACTIVE"
            ).order_by("employee_name")
        )

        self.fields["to_employee"].queryset = (
            Employee.objects.filter(
                status="ACTIVE"
            ).order_by("employee_name")
        )

    def clean(self):
        cleaned_data = super().clean()

        material = cleaned_data.get("material")
        from_employee = cleaned_data.get("from_employee")
        to_employee = cleaned_data.get("to_employee")

        if material and from_employee:

            allocation = (
                AssetAllocation.objects
                .filter(
                    material=material,
                    employee=from_employee,
                    status="ALLOCATED",
                )
                .order_by("-allocation_date")
                .first()
            )

            if not allocation:
                raise forms.ValidationError(
                    "This asset is not currently allocated to the selected From employee."
                )

        if from_employee and to_employee:
            if from_employee == to_employee:
                raise forms.ValidationError(
                    "From employee and To employee cannot be the same."
                )

        return cleaned_data

from django.contrib import admin

admin.site.site_header = "Integra Micro Systems Pvt Ltd - IT Material Management"
admin.site.site_title = "IT Material Management Portal"
admin.site.index_title = "Welcome to IT Material Management"
from .models import (
    Material,
    Employee,
    AssetAllocation,
    AssetReturn,
    AssetTransfer,
)


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):

    list_display = (
        "material_code",
        "material_name",
        "category",
        "brand",
        "model",
        "material_type",
        "serial_number",
        "status",
        "purchase_price",
        "active",
    )

    search_fields = (
        "material_code",
        "material_name",
        "serial_number",
        "brand",
        "model",
    )

    list_filter = (
        "category",
        "material_type",
        "status",
        "active",
    )

    list_per_page = 20

    fieldsets = (
        ("Material Information", {
            "fields": (
                "material_code",
                "material_name",
                "category",
                "brand",
                "model",
                "material_type",
            )
        }),

        ("Asset Details", {
            "fields": (
                "unit",
                "serial_number",
                "status",
                "active",
            )
        }),

        ("Purchase Information", {
            "fields": (
                "purchase_price",
                "warranty_months",
            )
        }),
    )


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):

    list_display = (
        "employee_id",
        "employee_name",
        "department",
        "designation",
        "company",
        "location",
        "email",
        "mobile",
        "status",
    )

    search_fields = (
        "employee_id",
        "employee_name",
        "department",
        "company",
        "email",
        "mobile",
    )

    list_filter = (
        "department",
        "company",
        "location",
        "status",
    )

    list_per_page = 20


@admin.register(AssetAllocation)
class AssetAllocationAdmin(admin.ModelAdmin):

    list_display = (
        "material",
        "employee",
        "allocation_date",
        "location",
        "status",
        "created_at",
    )

    search_fields = (
        "material__material_code",
        "material__material_name",
        "material__serial_number",
        "employee__employee_id",
        "employee__employee_name",
    )

    list_filter = (
        "status",
        "location",
        "allocation_date",
    )

    list_per_page = 20

    fieldsets = (
        ("Allocation Information", {
            "fields": (
                "material",
                "employee",
                "allocation_date",
                "location",
                "status",
                "remarks",
            )
        }),
    )
@admin.register(AssetReturn)
class AssetReturnAdmin(admin.ModelAdmin):

    list_display = (
        "allocation",
        "return_date",
        "condition",
        "created_at",
    )

    search_fields = (
        "allocation__material__material_code",
        "allocation__material__material_name",
        "allocation__material__serial_number",
        "allocation__employee__employee_id",
        "allocation__employee__employee_name",
    )

    list_filter = (
        "condition",
        "return_date",
    )

    list_per_page = 20

    fieldsets = (
        ("Return Information", {
            "fields": (
                "allocation",
                "return_date",
                "condition",
                "remarks",
            )
        }),
    )
@admin.register(AssetTransfer)
class AssetTransferAdmin(admin.ModelAdmin):

    list_display = (
        "material",
        "from_employee",
        "to_employee",
        "transfer_date",
        "from_location",
        "to_location",
        "created_at",
    )

    search_fields = (
        "material__material_code",
        "material__material_name",
        "material__serial_number",
        "from_employee__employee_id",
        "from_employee__employee_name",
        "to_employee__employee_id",
        "to_employee__employee_name",
    )

    list_filter = (
        "transfer_date",
        "from_location",
        "to_location",
    )

    list_per_page = 20

    fieldsets = (
        ("Transfer Information", {
            "fields": (
                "material",
                "from_employee",
                "to_employee",
                "transfer_date",
                "from_location",
                "to_location",
                "remarks",
            )
        }),
    )

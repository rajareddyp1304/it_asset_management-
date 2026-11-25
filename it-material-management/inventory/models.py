from django.db import models


class Material(models.Model):
    MATERIAL_TYPES = [
        ("ASSET", "Asset"),
        ("CONSUMABLE", "Consumable"),
    ]

    STATUS_CHOICES = [
        ("AVAILABLE", "Available"),
        ("ASSIGNED", "Assigned"),
        ("DAMAGED", "Damaged"),
        ("RETIRED", "Retired"),
    ]

    CRITICALITY_CHOICES = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
        ("CRITICAL", "Critical"),
    ]

    CONDITION_CHOICES = [
        ("NEW", "New"),
        ("GOOD", "Good"),
        ("FAIR", "Fair"),
        ("DAMAGED", "Damaged"),
    ]

    material_code = models.CharField(max_length=50, unique=True)
    material_name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)

    brand = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)

    serial_number = models.CharField(
        max_length=100,
        blank=True
    )

    data_port_no = models.CharField(
        max_length=100,
        blank=True
    )

    processor = models.CharField(
        max_length=200,
        blank=True
    )

    ram = models.CharField(
        max_length=50,
        blank=True
    )

    storage = models.CharField(
        max_length=100,
        blank=True
    )

    project_manager = models.CharField(
        max_length=200,
        blank=True
    )

    company_name = models.CharField(
        max_length=200,
        blank=True
    )

    operating_system = models.CharField(
        max_length=100,
        blank=True
    )

    oem = models.CharField(
        max_length=100,
        blank=True
    )

    cpu_asset_no = models.CharField(
        max_length=100,
        blank=True
    )

    location = models.CharField(
        max_length=100,
        blank=True
    )

    criticality = models.CharField(
        max_length=20,
        choices=CRITICALITY_CHOICES,
        default="MEDIUM"
    )

    customer_data = models.BooleanField(
        default=False
    )

    material_type = models.CharField(
        max_length=20,
        choices=MATERIAL_TYPES,
        default="ASSET"
    )

    unit = models.CharField(
        max_length=20,
        default="PCS"
    )

    purchase_date = models.DateField(
        null=True,
        blank=True
    )

    purchase_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    vendor = models.CharField(
        max_length=200,
        blank=True
    )

    invoice_number = models.CharField(
        max_length=100,
        blank=True
    )

    po_number = models.CharField(
        max_length=100,
        blank=True
    )

    warranty_months = models.PositiveIntegerField(
        default=0
    )

    condition = models.CharField(
        max_length=20,
        choices=CONDITION_CHOICES,
        default="GOOD"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="AVAILABLE"
    )

    remarks = models.TextField(
        blank=True
    )

    active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.material_code} - {self.material_name}"


class Employee(models.Model):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
    ]

    employee_id = models.CharField(max_length=50, unique=True)
    employee_name = models.CharField(max_length=200)
    department = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    company = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    mobile = models.CharField(max_length=20, blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ACTIVE"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee_id} - {self.employee_name}"


class AssetAllocation(models.Model):
    STATUS_CHOICES = [
        ("ALLOCATED", "Allocated"),
        ("RETURNED", "Returned"),
    ]

    material = models.ForeignKey(
        Material,
        on_delete=models.PROTECT,
        related_name="allocations"
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="asset_allocations"
    )

    allocation_date = models.DateField()
    location = models.CharField(max_length=100, blank=True)
    remarks = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ALLOCATED"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.status == "ALLOCATED":
            self.material.status = "ASSIGNED"
            self.material.save(update_fields=["status"])

        elif self.status == "RETURNED":
            self.material.status = "AVAILABLE"
            self.material.save(update_fields=["status"])

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.material} → {self.employee}"
class AssetReturn(models.Model):
    RETURN_CONDITION_CHOICES = [
        ("GOOD", "Good"),
        ("DAMAGED", "Damaged"),
    ]

    allocation = models.ForeignKey(
        AssetAllocation,
        on_delete=models.PROTECT,
        related_name="returns"
    )

    return_date = models.DateField()
    condition = models.CharField(
        max_length=20,
        choices=RETURN_CONDITION_CHOICES,
        default="GOOD"
    )

    remarks = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.allocation.status = "RETURNED"
        self.allocation.save()

        if self.condition == "DAMAGED":
            self.allocation.material.status = "DAMAGED"
        else:
            self.allocation.material.status = "AVAILABLE"

        self.allocation.material.save(update_fields=["status"])

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Return - {self.allocation.material} - {self.allocation.employee}"
class AssetTransfer(models.Model):
    material = models.ForeignKey(
        Material,
        on_delete=models.PROTECT,
        related_name="transfers"
    )

    from_employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="transfers_from"
    )

    to_employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="transfers_to"
    )

    transfer_date = models.DateField()
    from_location = models.CharField(max_length=100, blank=True)
    to_location = models.CharField(max_length=100, blank=True)
    remarks = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):

        if not self.pk:

            current_allocation = AssetAllocation.objects.filter(
                material=self.material,
                employee=self.from_employee,
                status="ALLOCATED"
            ).order_by("-allocation_date").first()

            if current_allocation:
                current_allocation.status = "RETURNED"
                current_allocation.save()

            AssetAllocation.objects.create(
                material=self.material,
                employee=self.to_employee,
                allocation_date=self.transfer_date,
                location=self.to_location,
                remarks=f"Transferred from {self.from_employee}",
                status="ALLOCATED",
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.material} - "
            f"{self.from_employee} → {self.to_employee}"
        )

from django.shortcuts import render, redirect
from django.contrib import messages

from .models import (
    Material,
    Employee,
    AssetAllocation,
    AssetReturn,
    AssetTransfer,
)

from .forms import (
    MaterialForm,
    AssetReturnForm,
    AssetTransferForm,
)

def dashboard(request):
    materials = Material.objects.filter(active=True)

    context = {
        "total_materials": materials.count(),

        "available_materials": materials.filter(
            status="AVAILABLE"
        ).count(),

        "assigned_materials": materials.filter(
            status="ASSIGNED"
        ).count(),

        "damaged_materials": materials.filter(
            status="DAMAGED"
        ).count(),

        "retired_materials": materials.filter(
            status="RETIRED"
        ).count(),

        "total_employees": Employee.objects.filter(
            status="ACTIVE"
        ).count(),

        "recent_allocations": AssetAllocation.objects.select_related(
            "material",
            "employee"
        ).order_by("-created_at")[:5],

        "recent_returns": AssetReturn.objects.select_related(
            "allocation__material",
            "allocation__employee"
        ).order_by("-created_at")[:5],

        "recent_transfers": AssetTransfer.objects.select_related(
            "material",
            "from_employee",
            "to_employee"
        ).order_by("-created_at")[:5],
    }

    return render(
        request,
        "inventory/dashboard.html",
        context
    )


def material_list(request):
    materials = Material.objects.prefetch_related(
        "allocations__employee"
    ).order_by("-id")

    return render(
        request,
        "inventory/material_list.html",
        {"materials": materials}
    )


def material_add(request):
    if request.method == "POST":
        form = MaterialForm(request.POST)

        if form.is_valid():
            material = form.save()

            messages.success(
                request,
                f"{material.material_name} added successfully."
            )

            return redirect("material_list")

    else:
        form = MaterialForm()

    return render(
        request,
        "inventory/material_form.html",
        {"form": form}
    )


def employee_list(request):
    employees = Employee.objects.all().order_by("employee_name")

    return render(
        request,
       "inventory/employee_list.html",
        {"employees": employees}
    )


def employee_add(request):
    return redirect("/admin/inventory/employee/add/")


def allocation_list(request):
    allocations = AssetAllocation.objects.select_related(
        "material",
        "employee"
    ).order_by("-allocation_date")

    return render(
        request,
        "inventory/allocation_list.html",
        {"allocations": allocations}
    )


def allocation_add(request):
    return redirect(
        "/admin/inventory/assetallocation/add/"
    )


def return_list(request):
    returns = AssetReturn.objects.select_related(
        "allocation__material",
        "allocation__employee"
    ).order_by("-return_date")

    return render(
        request,
        "inventory/return_list.html",
        {"returns": returns}
    )


def return_add(request):
    allocation_id = request.GET.get("allocation")

    if request.method == "POST":
        form = AssetReturnForm(request.POST)

        if form.is_valid():
            form.save()

            messages.success(
                request,
                "Asset returned successfully."
            )

            return redirect("return_list")

    else:
        form = AssetReturnForm()

        if allocation_id:
            try:
                allocation = AssetAllocation.objects.get(
                    id=allocation_id,
                    status="ALLOCATED"
                )

                form.fields["allocation"].initial = allocation.id

            except AssetAllocation.DoesNotExist:
                pass

    return render(
        request,
        "inventory/return_form.html",
        {"form": form}
    )


def transfer_list(request):
    transfers = AssetTransfer.objects.select_related(
        "material",
        "from_employee",
        "to_employee"
    ).order_by("-transfer_date")

    return render(
        request,
        "inventory/transfer_list.html",
        {"transfers": transfers}
    )


def transfer_add(request):
    if request.method == "POST":
        form = AssetTransferForm(request.POST)

        if form.is_valid():
            transfer = form.save()

            messages.success(
                request,
                f"{transfer.material.material_name} transferred successfully."
            )

            return redirect("transfer_list")

    else:
        form = AssetTransferForm()

    return render(
        request,
        "inventory/transfer_form.html",
        {"form": form}
    )

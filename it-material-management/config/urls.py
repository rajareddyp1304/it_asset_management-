from django.contrib import admin
from django.urls import path

from inventory.views import (
    dashboard,
    material_list,
    material_add,
    employee_list,
    employee_add,
    allocation_list,
    allocation_add,
    return_list,
    return_add,
    transfer_list,
    transfer_add,
)

urlpatterns = [
    path("", dashboard, name="dashboard"),

    path(
        "materials/",
        material_list,
        name="material_list"
    ),

    path(
        "materials/add/",
        material_add,
        name="material_add"
    ),

    path(
        "employees/",
        employee_list,
        name="employee_list"
    ),

    path(
        "employees/add/",
        employee_add,
        name="employee_add"
    ),

    path(
        "allocations/",
        allocation_list,
        name="allocation_list"
    ),

    path(
        "allocations/add/",
        allocation_add,
        name="allocation_add"
    ),

    path(
        "returns/",
        return_list,
        name="return_list"
    ),

    path(
        "returns/add/",
        return_add,
        name="return_add"
    ),

    path(
        "transfers/",
        transfer_list,
        name="transfer_list"
    ),

    path(
        "transfers/add/",
        transfer_add,
        name="transfer_add"
    ),

    path(
        "admin/",
        admin.site.urls
    ),
]

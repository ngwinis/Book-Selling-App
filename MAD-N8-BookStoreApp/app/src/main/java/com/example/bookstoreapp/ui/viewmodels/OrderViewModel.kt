package com.example.bookstoreapp.ui.viewmodels

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.bookstoreapp.data.api.RetrofitClient
import com.example.bookstoreapp.data.api.TokenManager
import com.example.bookstoreapp.data.model.*
import kotlinx.coroutines.launch

class OrderViewModel : ViewModel() {
    private val api = RetrofitClient.api

    var vouchers by mutableStateOf<List<VoucherItem>>(emptyList())
    var shipments by mutableStateOf<List<ShipmentItem>>(emptyList())
    var selectedVoucher by mutableStateOf<VoucherItem?>(null)
    var selectedShipment by mutableStateOf<ShipmentItem?>(null)
    var selectedAddress by mutableStateOf<AddressItem?>(null)
    var selectedPayment by mutableStateOf<PaymentItem?>(null)
    var validateResult by mutableStateOf<ValidateVoucherResponse?>(null)

    var orders by mutableStateOf<List<OrderItem>>(emptyList())
    var orderDetail by mutableStateOf<OrderDetailResponse?>(null)
    var checkoutResult by mutableStateOf<OrderResponse?>(null)
    var lastPaymentUrl by mutableStateOf<String?>(null)
    var message by mutableStateOf<String?>(null)
    var isLoading by mutableStateOf(false)

    fun loadVouchers() {
        viewModelScope.launch {
            try {
                val response = api.getVouchers()
                if (response.isSuccessful) vouchers = response.body() ?: emptyList()
            } catch (_: Exception) {}
        }
    }

    fun loadShipments() {
        viewModelScope.launch {
            try {
                val response = api.getShipments()
                if (response.isSuccessful) shipments = response.body() ?: emptyList()
            } catch (_: Exception) {}
        }
    }

    fun validateVoucher(code: String, totalAmount: Double) {
        viewModelScope.launch {
            try {
                val response = api.validateVoucher(ValidateVoucherRequest(code, totalAmount))
                if (response.isSuccessful) validateResult = response.body()
                else validateResult = ValidateVoucherResponse(false, message = "Mã không hợp lệ")
            } catch (_: Exception) {}
        }
    }

    fun checkout(
        addressId: Int,
        paymentId: Int,
        shipmentId: Int,
        voucherId: Int?,
        selectedCartItemIds: List<Int>,
        onSuccess: (OrderResponse) -> Unit
    ) {
        viewModelScope.launch {
            isLoading = true
            try {
                val request = CheckoutRequest(
                    customerId = TokenManager.customerId,
                    addressId = addressId,
                    paymentId = paymentId,
                    shipmentId = shipmentId,
                    voucherId = voucherId,
                    selectedCartItemIds = selectedCartItemIds
                )
                val response = api.checkout(request)
                if (response.isSuccessful && response.body() != null) {
                    checkoutResult = response.body()
                    lastPaymentUrl = checkoutResult?.paymentUrl
                    onSuccess(checkoutResult!!)
                } else {
                    message = "Đặt hàng thất bại"
                }
            } catch (e: Exception) {
                message = e.message
            }
            isLoading = false
        }
    }

    fun buyNow(
        addressId: Int,
        paymentId: Int,
        shipmentId: Int,
        voucherId: Int?,
        bookId: Int,
        quantity: Int,
        onSuccess: (OrderResponse) -> Unit
    ) {
        viewModelScope.launch {
            isLoading = true
            try {
                val request = BuyNowRequest(TokenManager.customerId, addressId, paymentId, shipmentId, voucherId, bookId, quantity)
                val response = api.buyNow(request)
                if (response.isSuccessful && response.body() != null) {
                    checkoutResult = response.body()
                    lastPaymentUrl = checkoutResult?.paymentUrl
                    onSuccess(checkoutResult!!)
                } else {
                    message = "Mua hàng thất bại"
                }
            } catch (e: Exception) {
                message = e.message
            }
            isLoading = false
        }
    }

    fun loadOrders(status: String? = null) {
        viewModelScope.launch {
            isLoading = true
            try {
                val response = api.getOrders(TokenManager.customerId, status)
                if (response.isSuccessful) orders = response.body() ?: emptyList()
            } catch (_: Exception) {}
            isLoading = false
        }
    }

    fun loadOrderDetail(orderId: Int) {
        viewModelScope.launch {
            orderDetail = null
            try {
                val response = api.getOrderDetail(orderId)
                if (response.isSuccessful) orderDetail = response.body()
            } catch (_: Exception) {}
        }
    }

    fun cancelOrder(orderId: Int, onDone: () -> Unit) {
        viewModelScope.launch {
            try {
                val response = api.cancelOrder(orderId)
                if (response.isSuccessful) {
                    loadOrders()
                    onDone()
                } else {
                    message = "Không thể hủy đơn hàng này"
                }
            } catch (e: Exception) {
                message = e.message
            }
        }
    }

    fun repayOrder(orderId: Int, onDone: (OrderResponse?) -> Unit) {
        viewModelScope.launch {
            isLoading = true
            try {
                val response = api.repayOrder(mapOf("orderId" to orderId))
                if (response.isSuccessful) {
                    val body = response.body()
                    lastPaymentUrl = body?.paymentUrl
                    body?.status?.let { newStatus ->
                        orderDetail = orderDetail?.copy(status = newStatus)
                        orders = orders.map { order ->
                            if (order.orderId == orderId) order.copy(status = newStatus) else order
                        }
                    }
                    loadOrderDetail(orderId)
                    loadOrders()
                    onDone(body)
                } else {
                    message = "Không thể xác nhận thanh toán cho đơn hàng này"
                    onDone(null)
                }
            } catch (e: Exception) {
                message = e.message
                onDone(null)
            }
            isLoading = false
        }
    }
}

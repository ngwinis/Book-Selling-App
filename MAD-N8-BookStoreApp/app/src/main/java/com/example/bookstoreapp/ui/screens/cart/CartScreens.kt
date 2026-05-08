package com.example.bookstoreapp.ui.screens.cart

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.example.bookstoreapp.data.model.PaymentItem
import com.example.bookstoreapp.ui.components.MainTopAppBar
import com.example.bookstoreapp.ui.navigation.Screen
import com.example.bookstoreapp.ui.viewmodels.CartViewModel
import com.example.bookstoreapp.ui.viewmodels.OrderViewModel
import java.text.NumberFormat
import java.util.Locale

@Composable
fun CartScreen(navController: NavController, cartViewModel: CartViewModel = viewModel()) {
    val format = NumberFormat.getCurrencyInstance(Locale("vi", "VN"))

    LaunchedEffect(Unit) { cartViewModel.loadCart() }

    Scaffold(
        bottomBar = {
            if (cartViewModel.cartItems.isNotEmpty()) {
                Surface(
                    shadowElevation = 8.dp,
                    tonalElevation = 4.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Total", style = MaterialTheme.typography.bodyMedium, color = Color.Gray)
                            Text(
                                format.format(cartViewModel.selectedTotalPrice * 100000),
                                style = MaterialTheme.typography.titleLarge
                            )
                            Text(
                                text = if (cartViewModel.hasSelectedItems) {
                                    "Ready to checkout"
                                } else {
                                    "Select products to enable checkout"
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.Gray
                            )
                        }
                        Button(
                            onClick = { navController.navigate(Screen.Checkout.route) },
                            enabled = cartViewModel.hasSelectedItems,
                            colors = ButtonDefaults.buttonColors(
                                disabledContainerColor = Color(0xFFDEDEDE),
                                disabledContentColor = Color(0xFF8A8A8A)
                            ),
                            modifier = Modifier.alpha(if (cartViewModel.hasSelectedItems) 1f else 0.75f)
                        ) {
                            Text("Checkout")
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
        ) {
            Text(
                "Your Cart",
                style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.padding(top = 16.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))

            if (cartViewModel.isLoading) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (cartViewModel.cartItems.isEmpty()) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Your cart is empty", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(bottom = 24.dp)
                ) {
                    items(cartViewModel.cartItems) { item ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .clickable { navController.navigate("product_detail/${item.bookId}") }
                        ) {
                            Row(
                                modifier = Modifier.padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Checkbox(
                                    checked = cartViewModel.isSelected(item.cartItemId),
                                    onCheckedChange = { checked ->
                                        cartViewModel.toggleSelection(item.cartItemId, checked)
                                    }
                                )
                                if (!item.bookImage.isNullOrEmpty()) {
                                    AsyncImage(
                                        model = item.fullImageUrl,
                                        contentDescription = null,
                                        modifier = Modifier.size(60.dp),
                                        contentScale = ContentScale.Crop
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                }
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .padding(horizontal = 8.dp)
                                ) {
                                    Text(item.bookTitle, style = MaterialTheme.typography.titleMedium, maxLines = 2)
                                    Text(
                                        format.format(item.bookPrice * 100000),
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(top = 4.dp)
                                    ) {
                                        OutlinedButton(
                                            onClick = {
                                                if (item.quantity > 1) {
                                                    cartViewModel.updateQuantity(item.cartItemId, item.quantity - 1)
                                                }
                                            },
                                            enabled = item.quantity > 1,
                                            modifier = Modifier.size(32.dp),
                                            contentPadding = PaddingValues(0.dp)
                                        ) {
                                            Text("-")
                                        }
                                        Text(item.quantity.toString(), modifier = Modifier.padding(horizontal = 12.dp))
                                        OutlinedButton(
                                            onClick = { cartViewModel.updateQuantity(item.cartItemId, item.quantity + 1) },
                                            modifier = Modifier.size(32.dp),
                                            contentPadding = PaddingValues(0.dp)
                                        ) {
                                            Text("+")
                                        }
                                    }
                                }
                                IconButton(onClick = { cartViewModel.deleteItem(item.cartItemId) }) {
                                    Icon(
                                        Icons.Outlined.Delete,
                                        contentDescription = "Delete",
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CheckoutScreen(
    navController: NavController,
    orderViewModel: OrderViewModel = viewModel(),
    cartViewModel: CartViewModel = viewModel()
) {
    val context = LocalContext.current
    val selectedPayment = orderViewModel.selectedPayment
    val canCheckout = !orderViewModel.isLoading &&
        cartViewModel.hasSelectedItems &&
        orderViewModel.selectedAddress != null &&
        selectedPayment != null &&
        selectedPayment.isSupportedInCheckout &&
        orderViewModel.selectedShipment != null
    val checkoutLabel = when {
        selectedPayment?.isCashOnDelivery == true -> "Confirm COD Order"
        selectedPayment?.isBankTransfer == true -> "Create Pending Payment Order"
        else -> "Confirm Order"
    }

    LaunchedEffect(Unit) {
        orderViewModel.loadShipments()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        MainTopAppBar("Checkout", navController)
        Column(
            modifier = Modifier
                .padding(16.dp)
                .weight(1f)
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            Card(modifier = Modifier.fillMaxWidth().clickable { navController.navigate("address_selection") }) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Shipping Address", fontWeight = FontWeight.Bold)
                        Text(
                            orderViewModel.selectedAddress?.let { "${it.receiverName} - ${it.addressString}" }
                                ?: "Select Address",
                            color = Color.Gray,
                            maxLines = 1
                        )
                    }
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Gray)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            Card(modifier = Modifier.fillMaxWidth().clickable { navController.navigate("payment_selection") }) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Payment Method", fontWeight = FontWeight.Bold)
                        Text(
                            orderViewModel.selectedPayment?.paymentMethod ?: "Select Method",
                            color = Color.Gray,
                            maxLines = 1
                        )
                    }
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Gray)
                }
            }

            selectedPayment?.let { payment ->
                Spacer(modifier = Modifier.height(12.dp))
                PaymentSupportCard(payment = payment)
            }

            Spacer(modifier = Modifier.height(16.dp))
            Card(modifier = Modifier.fillMaxWidth().clickable { navController.navigate(Screen.ShipmentSelection.route) }) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Shipping Method", fontWeight = FontWeight.Bold)
                        Text(
                            orderViewModel.selectedShipment?.shipmentMethod ?: "Select Carrier",
                            color = Color.Gray,
                            maxLines = 1
                        )
                    }
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Gray)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            Card(
                modifier = Modifier.fillMaxWidth().clickable {
                    navController.navigate("voucher_selection/${cartViewModel.selectedTotalPrice}")
                }
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Promotion / Voucher", fontWeight = FontWeight.Bold)
                        Text(
                            orderViewModel.selectedVoucher?.description ?: "Select Voucher",
                            color = Color(0xFF2E7D32),
                            maxLines = 1
                        )
                    }
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Gray)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            Text(
                "Selected ${cartViewModel.selectedCartItemIds.size} products",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.Gray
            )
        }

        Surface(shadowElevation = 8.dp) {
            Button(
                onClick = {
                    orderViewModel.checkout(
                        addressId = orderViewModel.selectedAddress?.addressId ?: 0,
                        paymentId = orderViewModel.selectedPayment?.paymentId ?: 0,
                        shipmentId = orderViewModel.selectedShipment?.shipmentId ?: 0,
                        voucherId = orderViewModel.selectedVoucher?.voucherId,
                        selectedCartItemIds = cartViewModel.selectedCartItemIds
                    ) { result ->
                        cartViewModel.loadCart()
                        cartViewModel.clearSelection()
                        Toast.makeText(
                            context,
                            result.message ?: "Order placed successfully",
                            Toast.LENGTH_SHORT
                        ).show()
                        navController.navigate(Screen.OrderHistory.route)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .height(50.dp),
                enabled = canCheckout
            ) {
                if (orderViewModel.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text(checkoutLabel)
                }
            }
        }
    }
}

@Composable
fun AddressSelectionScreen(
    navController: NavController,
    orderViewModel: OrderViewModel = viewModel(),
    profileViewModel: com.example.bookstoreapp.ui.viewmodels.ProfileViewModel = viewModel()
) {
    LaunchedEffect(Unit) { profileViewModel.loadAddresses() }

    Column(modifier = Modifier.fillMaxSize()) {
        MainTopAppBar("Select Shipping Address", navController)
        Column(
            modifier = Modifier
                .padding(16.dp)
                .weight(1f)
        ) {
            if (profileViewModel.addresses.isEmpty()) {
                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    Text("No addresses yet", color = Color.Gray)
                }
            } else {
                profileViewModel.addresses.forEach { addr ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp),
                        onClick = {
                            orderViewModel.selectedAddress = addr
                            navController.popBackStack()
                        }
                    ) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(addr.receiverName, fontWeight = FontWeight.Bold)
                                Text(addr.addressString, color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                            }
                            androidx.compose.material3.RadioButton(
                                selected = orderViewModel.selectedAddress?.addressId == addr.addressId,
                                onClick = {
                                    orderViewModel.selectedAddress = addr
                                    navController.popBackStack()
                                }
                            )
                        }
                    }
                }
            }
        }
        Button(
            onClick = { navController.navigate(Screen.AddAddress.route) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text("+ Add New Address")
        }
    }
}

@Composable
fun PaymentSelectionScreen(
    navController: NavController,
    orderViewModel: OrderViewModel = viewModel(),
    profileViewModel: com.example.bookstoreapp.ui.viewmodels.ProfileViewModel = viewModel()
) {
    val context = LocalContext.current
    LaunchedEffect(Unit) { profileViewModel.loadPayments() }

    Column(modifier = Modifier.fillMaxSize()) {
        MainTopAppBar("Select Payment Method", navController)
        Column(
            modifier = Modifier
                .padding(16.dp)
                .weight(1f)
        ) {
            Text(
                "The app currently completes only COD and bank transfer payments.",
                color = Color.Gray,
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.height(12.dp))
            if (profileViewModel.payments.isEmpty()) {
                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    Text("No payment methods yet", color = Color.Gray)
                }
            } else {
                profileViewModel.payments.forEach { payment ->
                    val isSupported = payment.isSupportedInCheckout
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp)
                            .alpha(if (isSupported) 1f else 0.6f),
                        onClick = {
                            if (isSupported) {
                                orderViewModel.selectedPayment = payment
                                navController.popBackStack()
                            } else {
                                Toast.makeText(
                                    context,
                                    "This payment method is not supported in the app",
                                    Toast.LENGTH_SHORT
                                ).show()
                            }
                        }
                    ) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(payment.paymentMethod)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    payment.displayStatus,
                                    color = if (isSupported) Color(0xFF2E7D32) else MaterialTheme.colorScheme.error,
                                    style = MaterialTheme.typography.bodySmall
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    payment.checkoutHint,
                                    color = Color.Gray,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                            androidx.compose.material3.RadioButton(
                                selected = orderViewModel.selectedPayment?.paymentId == payment.paymentId,
                                enabled = isSupported,
                                onClick = {
                                    if (isSupported) {
                                        orderViewModel.selectedPayment = payment
                                        navController.popBackStack()
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
        Button(
            onClick = { navController.navigate(Screen.AddPaymentMethod.route) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text("+ Add New Payment Method")
        }
    }
}

@Composable
private fun PaymentSupportCard(payment: PaymentItem) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                if (payment.isSupportedInCheckout) "Payment Instructions" else "Method Status",
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                payment.checkoutHint,
                color = Color.Gray,
                style = MaterialTheme.typography.bodyMedium
            )

            if (payment.isBankTransfer) {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(12.dp))
                Text("Bank: Vietcombank", style = MaterialTheme.typography.bodyMedium)
                Text("Account number: 0123456789", style = MaterialTheme.typography.bodyMedium)
                Text("Account holder: MAD N8 BookStore", style = MaterialTheme.typography.bodyMedium)
                Text(
                    "After transferring, open order details and tap 'Confirm Bank Transfer'.",
                    color = Color.Gray,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    }
}

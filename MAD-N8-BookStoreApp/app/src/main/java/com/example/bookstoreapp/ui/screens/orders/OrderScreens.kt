package com.example.bookstoreapp.ui.screens.orders

import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.example.bookstoreapp.ui.components.MainTopAppBar
import com.example.bookstoreapp.ui.navigation.Screen
import com.example.bookstoreapp.ui.viewmodels.OrderViewModel
import java.text.NumberFormat
import java.util.Locale
import kotlinx.coroutines.launch

@Composable
fun OrderHistoryScreen(navController: NavController, orderViewModel: OrderViewModel = viewModel()) {
    val tabs = listOf("All", "Pending payment", "Processing", "Shipping", "Completed", "Canceled")
    val pagerState = rememberPagerState(pageCount = { tabs.size })
    val coroutineScope = rememberCoroutineScope()
    val format = NumberFormat.getCurrencyInstance(Locale("vi", "VN"))
    val handleBack = {
        if (!navController.navigateUp()) {
            navController.navigate(Screen.Profile.route) {
                launchSingleTop = true
            }
        }
    }

    val statusQuery = when (pagerState.currentPage) {
        0 -> null
        1 -> "Pending payment"
        2 -> "Processing"
        3 -> "Shipping"
        4 -> "Completed"
        5 -> "Canceled"
        else -> null
    }

    LaunchedEffect(pagerState.currentPage) { orderViewModel.loadOrders(statusQuery) }
    BackHandler(onBack = handleBack)

    Column(modifier = Modifier.fillMaxSize()) {
        MainTopAppBar("Order History", navController, onBack = handleBack)

        ScrollableTabRow(selectedTabIndex = pagerState.currentPage) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = pagerState.currentPage == index,
                    onClick = { coroutineScope.launch { pagerState.animateScrollToPage(index) } },
                    text = { Text(title) }
                )
            }
        }

        HorizontalPager(state = pagerState, modifier = Modifier.weight(1f)) {
            if (orderViewModel.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (orderViewModel.orders.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No orders yet", color = Color.Gray)
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp)
                ) {
                    items(orderViewModel.orders) { order ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            onClick = { navController.navigate("order_detail/${order.orderId}") }
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Order #${order.orderId}", style = MaterialTheme.typography.titleMedium)
                                    Text(
                                        order.status ?: "",
                                        color = when (order.status) {
                                            "Completed" -> Color(0xFF2E7D32)
                                            "Canceled" -> Color.Red
                                            else -> MaterialTheme.colorScheme.primary
                                        }
                                    )
                                }
                                if (order.orderDate != null) {
                                    Text(
                                        "Date: ${order.orderDate}",
                                        color = Color.Gray,
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                                val orderTotal = (order.finalAmount ?: order.totalAmount ?: 0.0) * 100000
                                Text(
                                    "Total: ${format.format(orderTotal)}",
                                    color = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun OrderDetailScreen(navController: NavController, orderId: Int, orderViewModel: OrderViewModel = viewModel()) {
    val context = LocalContext.current
    val format = NumberFormat.getCurrencyInstance(Locale("vi", "VN"))

    LaunchedEffect(orderId) { orderViewModel.loadOrderDetail(orderId) }

    val detail = orderViewModel.orderDetail

    Column(modifier = Modifier.fillMaxSize()) {
        MainTopAppBar("Order Details", navController)

        if (detail == null) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            val canConfirmTransfer = detail.status == "Pending payment" &&
                (detail.payment?.isBankTransfer == true)

            Column(
                modifier = Modifier
                    .padding(16.dp)
                    .weight(1f)
            ) {
                Text("Order #${detail.orderId}", style = MaterialTheme.typography.titleLarge)
                Text("Status: ${detail.status}", color = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.height(8.dp))

                detail.address?.let {
                    Text("Ship to: ${it.receiverName} - ${it.addressString}", color = Color.Gray)
                }
                detail.payment?.let {
                    Text("Checkout: ${it.paymentMethod}", color = Color.Gray)
                }
                detail.shipment?.let {
                    Text("Shipping: ${it.shipmentMethod}", color = Color.Gray)
                }

                if (detail.payment?.isBankTransfer == true) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text("Bank Transfer Instructions", style = MaterialTheme.typography.titleMedium)
                            Spacer(modifier = Modifier.height(6.dp))
                            Text("Bank: Vietcombank", style = MaterialTheme.typography.bodyMedium)
                            Text("Account number: 0123456789", style = MaterialTheme.typography.bodyMedium)
                            Text("Account holder: MAD N8 BookStore", style = MaterialTheme.typography.bodyMedium)
                            Text(
                                if (detail.status == "Pending payment") {
                                    "After transferring, tap 'Confirm Bank Transfer' to move the order to Processing."
                                } else {
                                    "This bank-transfer order is being processed."
                                },
                                color = Color.Gray,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(top = 8.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(8.dp))
                Text("Products:", style = MaterialTheme.typography.titleMedium)

                if (detail.items.isNullOrEmpty()) {
                    Text("No product data is available for this order", color = Color.Gray)
                } else {
                    detail.items.forEach { item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (!item.bookImage.isNullOrEmpty()) {
                                AsyncImage(
                                    model = item.fullImageUrl,
                                    contentDescription = null,
                                    modifier = Modifier.size(50.dp),
                                    contentScale = ContentScale.Crop
                                )
                                Spacer(modifier = Modifier.padding(4.dp))
                            }

                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.bookTitle ?: "Book", maxLines = 1)
                                val itemPrice = (item.bookPrice ?: 0.0) * 100000
                                Text("Qty: ${item.quantity ?: 1} × ${format.format(itemPrice)}", color = Color.Gray)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(8.dp))

                val rawTotal = (detail.totalAmount ?: 0.0) * 100000
                Text("Total before discount: ${format.format(rawTotal)}")

                detail.voucher?.let {
                    Text("Discount: ${it.description ?: it.code}", color = Color(0xFF2E7D32))
                }

                val rawFinal = (detail.finalAmount ?: detail.totalAmount ?: 0.0) * 100000
                Text(
                    "Checkout: ${format.format(rawFinal)}",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            if (canConfirmTransfer) {
                Button(
                    onClick = {
                        orderViewModel.repayOrder(orderId) { result ->
                            Toast.makeText(
                                context,
                                result?.message ?: "Payment confirmed",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                ) {
                    Text("Confirm Bank Transfer")
                }
            }

            if (detail.status == "Pending payment" || detail.status == "Processing") {
                Button(
                    onClick = {
                        orderViewModel.cancelOrder(orderId) {
                            Toast.makeText(context, "Order canceled", Toast.LENGTH_SHORT).show()
                            navController.popBackStack()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Text("Cancel Order")
                }
            } else {
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

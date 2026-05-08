package com.example.bookstoreapp.ui.screens.profile

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.outlined.CheckCircleOutline
import androidx.compose.material.icons.outlined.CreditCard
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.LocalShipping
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Payment
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.example.bookstoreapp.data.api.TokenManager
import com.example.bookstoreapp.data.local.DatabaseHelper
import com.example.bookstoreapp.ui.components.MainTopAppBar
import com.example.bookstoreapp.ui.navigation.Screen
import com.example.bookstoreapp.ui.screens.auth.LoginScreen
import com.example.bookstoreapp.ui.viewmodels.AuthViewModel
import com.example.bookstoreapp.ui.viewmodels.ProfileViewModel

@Composable
fun ProfileScreen(navController: NavController) {
    val context = LocalContext.current
    val dbHelper = remember { DatabaseHelper(context) }
    var isLoggedIn by remember { mutableStateOf(dbHelper.isLoggedIn()) }

    if (!isLoggedIn) {
        LoginScreen(navController = navController)
    } else {
        ProfileContent(navController = navController) {
            dbHelper.setLoginData(false)
            TokenManager.token = null
            TokenManager.customerId = -1
            isLoggedIn = false
            navController.navigate(Screen.Home.route) { popUpTo(0) }
        }
    }
}

@Composable
fun ProfileContent(navController: NavController, onLogout: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp)
                .background(MaterialTheme.colorScheme.primary)
        ) {
            Text(
                "Account",
                modifier = Modifier.align(Alignment.Center),
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .clickable { navController.navigate(Screen.OrderHistory.route) }
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("My Orders", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Gray)
                }
                Spacer(modifier = Modifier.height(16.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    OrderStateItem(Icons.Outlined.CreditCard, "Pending payment")
                    OrderStateItem(Icons.Outlined.Inventory2, "Processing")
                    OrderStateItem(Icons.Outlined.LocalShipping, "Shipping")
                    OrderStateItem(Icons.Outlined.CheckCircleOutline, "Completed")
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp).fillMaxWidth().background(Color(0xFFF3F3F3)))
        ProfileMenuItem(Icons.Outlined.PersonOutline, "Profile") { navController.navigate(Screen.EditProfile.route) }
        HorizontalDivider(color = Color(0xFFF3F3F3), thickness = 1.dp)
        ProfileMenuItem(Icons.Outlined.LocationOn, "Manage Addresses") { navController.navigate(Screen.AddressMap.route) }
        HorizontalDivider(color = Color(0xFFF3F3F3), thickness = 1.dp)
        ProfileMenuItem(Icons.Outlined.Payment, "Payment Method") { navController.navigate(Screen.PaymentMethod.route) }
        HorizontalDivider(color = Color(0xFFF3F3F3), thickness = 1.dp)
        ProfileMenuItem(Icons.Outlined.Lock, "Change Password") { navController.navigate(Screen.ChangePassword.route) }

        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick = onLogout,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
        ) {
            Text("Log Out", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
fun OrderStateItem(icon: ImageVector, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(70.dp)) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(Color(0xFFF5F5F5)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = label, tint = Color.DarkGray)
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(label, fontSize = 11.sp, color = Color.Gray, textAlign = TextAlign.Center)
    }
}

@Composable
fun ProfileMenuItem(icon: ImageVector, title: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = title,
            tint = when (title) {
                "Profile", "Change Password" -> Color(0xFFE91E63)
                "Manage Addresses" -> Color(0xFF4CAF50)
                else -> Color(0xFF2196F3)
            }
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(title, modifier = Modifier.weight(1f), fontSize = 16.sp)
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Gray)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(navController: NavController, profileViewModel: ProfileViewModel = viewModel()) {
    LaunchedEffect(Unit) { profileViewModel.loadProfile() }
    val profile = profileViewModel.profile

    var name by remember(profile) { mutableStateOf(profile?.fullName ?: "") }
    var email by remember(profile) { mutableStateOf(profile?.email ?: "") }
    var phone by remember(profile) { mutableStateOf(profile?.phoneNumber ?: "") }
    val context = LocalContext.current

    Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
        TopAppBar(
            title = { Text("Update Information", color = Color.White) },
            navigationIcon = {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary)
        )

        Column(modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
            Text("Full Name", fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 4.dp))
            OutlinedTextField(value = name, onValueChange = { name = it }, placeholder = { Text("Enter full name") }, modifier = Modifier.fillMaxWidth())

            Spacer(modifier = Modifier.height(16.dp))
            Text("Email", fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 4.dp))
            OutlinedTextField(value = email, onValueChange = {}, placeholder = { Text("Email") }, modifier = Modifier.fillMaxWidth(), enabled = false)

            Spacer(modifier = Modifier.height(16.dp))
            Text("Phone Number", fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 4.dp))
            OutlinedTextField(value = phone, onValueChange = { phone = it }, modifier = Modifier.fillMaxWidth())

            Spacer(modifier = Modifier.height(32.dp))
            Button(onClick = {
                profileViewModel.updateProfile(name, phone) {
                    Toast.makeText(context, "Updated!", Toast.LENGTH_SHORT).show()
                    navController.popBackStack()
                }
            }, modifier = Modifier.fillMaxWidth().height(50.dp)) {
                Text("Save Changes", color = Color.White)
            }
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun AddressScreen(navController: NavController, profileViewModel: ProfileViewModel = viewModel()) {
    LaunchedEffect(Unit) { profileViewModel.loadAddresses() }

    Column(modifier = Modifier.fillMaxSize()) {
        MainTopAppBar("Manage Addresses", navController)
        Column(modifier = Modifier.padding(16.dp).weight(1f)) {
            profileViewModel.addresses.forEach { addr ->
                Card(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp), onClick = { navController.popBackStack() }) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(addr.receiverName, fontWeight = FontWeight.Bold)
                            Text(addr.addressString, color = Color.Gray)
                        }
                        IconButton(onClick = { profileViewModel.deleteAddress(addr.addressId ?: 0) }) {
                            Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }
        Button(onClick = { navController.navigate(Screen.AddAddress.route) }, modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text("+ Add New Address")
        }
    }
}

@Composable
fun PaymentMethodScreen(navController: NavController, profileViewModel: ProfileViewModel = viewModel()) {
    LaunchedEffect(Unit) { profileViewModel.loadPayments() }

    Column(modifier = Modifier.fillMaxSize()) {
        MainTopAppBar("Payment Method", navController)
        Column(modifier = Modifier.padding(16.dp).weight(1f)) {
            Text(
                "COD and bank transfer are active. Other methods are shown for reference only.",
                color = Color.Gray,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            if (profileViewModel.payments.isEmpty()) {
                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    Text("No payment methods yet", color = Color.Gray)
                }
            }
            profileViewModel.payments.forEach { payment ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp)
                        .alpha(if (payment.isSupportedInCheckout) 1f else 0.65f)
                ) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(payment.paymentMethod)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                payment.displayStatus,
                                color = if (payment.isSupportedInCheckout) Color(0xFF2E7D32) else MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                payment.checkoutHint,
                                color = Color.Gray,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                        IconButton(onClick = { profileViewModel.deletePayment(payment.paymentId ?: 0) }) {
                            Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }
        Button(onClick = { navController.navigate(Screen.AddPaymentMethod.route) }, modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text("+ Add New Payment Method")
        }
    }
}

@Composable
fun ChangePasswordScreen(navController: NavController, authViewModel: AuthViewModel = viewModel()) {
    var oldPass by remember { mutableStateOf("") }
    var newPass by remember { mutableStateOf("") }
    var confirmPass by remember { mutableStateOf("") }
    val context = LocalContext.current

    LaunchedEffect(authViewModel.passwordChanged) {
        if (authViewModel.passwordChanged) {
            authViewModel.passwordChanged = false
            Toast.makeText(context, "Password changed successfully!", Toast.LENGTH_SHORT).show()
            navController.popBackStack()
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        MainTopAppBar("Change Password", navController)
        Column(modifier = Modifier.padding(16.dp)) {
            OutlinedTextField(value = oldPass, onValueChange = { oldPass = it }, label = { Text("Old Password") }, modifier = Modifier.fillMaxWidth(), visualTransformation = PasswordVisualTransformation())
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(value = newPass, onValueChange = { newPass = it }, label = { Text("New Password") }, modifier = Modifier.fillMaxWidth(), visualTransformation = PasswordVisualTransformation())
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(value = confirmPass, onValueChange = { confirmPass = it }, label = { Text("Confirm Password") }, modifier = Modifier.fillMaxWidth(), visualTransformation = PasswordVisualTransformation())
            Spacer(modifier = Modifier.height(24.dp))
            Button(onClick = { authViewModel.changePassword(oldPass, newPass, confirmPass) }, modifier = Modifier.fillMaxWidth(), enabled = !authViewModel.isLoading) {
                Text("Update Password")
            }
        }
    }
}

@Composable
fun AddAddressScreen(navController: NavController, profileViewModel: ProfileViewModel = viewModel()) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var district by remember { mutableStateOf("") }
    var ward by remember { mutableStateOf("") }
    var detail by remember { mutableStateOf("") }
    val context = LocalContext.current

    Column(modifier = Modifier.fillMaxSize()) {
        MainTopAppBar("Add Shipping Address", navController)
        Column(modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Full Name") }, modifier = Modifier.fillMaxWidth())
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone Number") }, modifier = Modifier.fillMaxWidth())
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(value = city, onValueChange = { city = it }, label = { Text("Province / City") }, modifier = Modifier.fillMaxWidth())
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(value = district, onValueChange = { district = it }, label = { Text("District") }, modifier = Modifier.fillMaxWidth())
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(value = ward, onValueChange = { ward = it }, label = { Text("Ward") }, modifier = Modifier.fillMaxWidth())
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(value = detail, onValueChange = { detail = it }, label = { Text("Details (house number, street...)") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
            Spacer(modifier = Modifier.height(24.dp))
            Button(onClick = {
                val addressStr = "$detail, $ward, $district, $city | Phone: $phone"
                profileViewModel.createAddress(name, addressStr) {
                    Toast.makeText(context, "Address saved!", Toast.LENGTH_SHORT).show()
                    navController.popBackStack()
                }
            }, modifier = Modifier.fillMaxWidth()) {
                Text("Save Address")
            }
        }
    }
}

@Composable
fun AddPaymentMethodScreen(navController: NavController, profileViewModel: ProfileViewModel = viewModel()) {
    val paymentOptions = listOf(
        "Cash on Delivery (COD)" to "The order will move to Processing after it is placed.",
        "Bank transfer" to "The order will stay in Pending payment until you confirm the bank transfer.",
        "Momo wallet" to "This payment method is not currently supported for app checkout.",
        "ZaloPay" to "This payment method is not currently supported for app checkout.",
        "VNPay" to "This payment method is not currently supported for app checkout.",
        "Debit / credit card" to "This payment method is not currently supported for app checkout."
    )
    val supportedMethods = setOf(
        "Cash on Delivery (COD)",
        "Bank transfer"
    )
    var selectedMethod by remember { mutableStateOf(paymentOptions.first().first) }
    var customLabel by remember { mutableStateOf("") }
    val context = LocalContext.current

    Column(modifier = Modifier.fillMaxSize()) {
        MainTopAppBar("Add Payment Method", navController)
        Column(modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
            Text("Select Method", fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(12.dp))
            paymentOptions.forEach { (method, hint) ->
                val isSupported = method in supportedMethods
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp)
                        .clickable { selectedMethod = method }
                ) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(method)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                if (isSupported) "Active" else "Unsupported",
                                color = if (isSupported) Color(0xFF2E7D32) else MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                hint,
                                color = Color.Gray,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                        RadioButton(selected = selectedMethod == method, onClick = { selectedMethod = method })
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = customLabel,
                onValueChange = { customLabel = it },
                label = { Text("Display Note") },
                placeholder = { Text("Example: Vietcombank, personal Momo...") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(24.dp))
            Button(onClick = {
                val method = if (customLabel.isBlank()) selectedMethod else "$selectedMethod - $customLabel"
                profileViewModel.createPayment(method) {
                    Toast.makeText(context, "Payment method saved!", Toast.LENGTH_SHORT).show()
                    navController.popBackStack()
                }
            }, modifier = Modifier.fillMaxWidth()) {
                Text("Save Method")
            }
        }
    }
}

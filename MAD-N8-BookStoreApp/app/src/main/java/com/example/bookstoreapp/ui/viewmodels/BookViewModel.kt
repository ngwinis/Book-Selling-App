package com.example.bookstoreapp.ui.viewmodels

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.bookstoreapp.data.api.RetrofitClient
import com.example.bookstoreapp.data.api.TokenManager
import com.example.bookstoreapp.data.model.AISearchResponse
import com.example.bookstoreapp.data.model.AuthorInfo
import com.example.bookstoreapp.data.model.Book
import com.example.bookstoreapp.data.model.BookDetailResponse
import com.example.bookstoreapp.data.model.Category
import com.example.bookstoreapp.data.model.PostReviewRequest
import com.example.bookstoreapp.data.model.ReviewItem
import com.google.gson.Gson
import kotlinx.coroutines.launch
import okhttp3.MultipartBody
import org.json.JSONObject

class BookViewModel : ViewModel() {
    private val api = RetrofitClient.api
    private val gson = Gson()

    var categories by mutableStateOf<List<Category>>(emptyList())
    var forYouBooks by mutableStateOf<List<Book>>(emptyList())
    var bookList by mutableStateOf<List<Book>>(emptyList())
    var bookDetail by mutableStateOf<BookDetailResponse?>(null)
    var allReviews by mutableStateOf<List<ReviewItem>>(emptyList())
    var searchResults by mutableStateOf<List<Book>>(emptyList())
    var searchAuthorMatches by mutableStateOf<List<AuthorInfo>>(emptyList())
    var selectedAuthor by mutableStateOf<AuthorInfo?>(null)
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var recognizedText by mutableStateOf<String?>(null)
    var isSearchActive by mutableStateOf(false)
    var searchQuery by mutableStateOf("")
    var isReviewLoading by mutableStateOf(false)
    var reviewErrorMessage by mutableStateOf<String?>(null)

    val canWriteReview: Boolean
        get() = !TokenManager.token.isNullOrBlank() && TokenManager.customerId > 0

    fun loadCategories() {
        viewModelScope.launch {
            try {
                val response = api.getCategories()
                if (response.isSuccessful) {
                    categories = response.body() ?: emptyList()
                }
            } catch (_: Exception) {
            }
        }
    }

    fun loadForYou() {
        viewModelScope.launch {
            try {
                val response = api.getBooksForYou()
                if (response.isSuccessful) {
                    forYouBooks = response.body() ?: emptyList()
                }
            } catch (_: Exception) {
            }
        }
    }

    fun loadBooksByCategory(categoryId: Int?) {
        viewModelScope.launch {
            isLoading = true
            try {
                val response = api.getBooks(categoryId = categoryId)
                if (response.isSuccessful && response.body() != null) {
                    bookList = response.body()!!
                }
            } catch (_: Exception) {
            }
            isLoading = false
        }
    }

    fun loadBooksByAuthor(authorId: Int) {
        viewModelScope.launch {
            isLoading = true
            try {
                val response = api.getBooksByAuthor(authorId)
                if (response.isSuccessful && response.body() != null) {
                    bookList = response.body()!!
                }
            } catch (_: Exception) {
            }
            isLoading = false
        }
    }

    fun loadBookDetail(bookId: Int) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            bookDetail = null
            try {
                val response = api.getBookDetail(bookId)
                if (response.isSuccessful && response.body() != null) {
                    val detail = response.body()!!
                    bookDetail = detail
                    if (allReviews.isEmpty()) {
                        allReviews = detail.top3Reviews ?: emptyList()
                    }
                } else {
                    errorMessage = "Khong tai duoc chi tiet san pham."
                }
            } catch (e: Exception) {
                errorMessage = e.message ?: "Loi ket noi khi tai chi tiet san pham."
            }
            isLoading = false
        }
    }

    fun loadAllReviews(bookId: Int) {
        viewModelScope.launch {
            isReviewLoading = true
            reviewErrorMessage = null
            try {
                val response = api.getReviews(bookId)
                if (response.isSuccessful) {
                    val reviews = response.body() ?: emptyList()
                    allReviews = if (reviews.isNotEmpty()) reviews else (bookDetail?.top3Reviews ?: emptyList())
                } else {
                    reviewErrorMessage = "Khong tai duoc danh gia tu he thong."
                }
            } catch (e: Exception) {
                reviewErrorMessage = e.message ?: "Khong tai duoc danh gia tu he thong."
            }
            isReviewLoading = false
        }
    }

    fun postReview(bookId: Int, rating: Int, comment: String, onDone: (Boolean) -> Unit) {
        viewModelScope.launch {
            if (!canWriteReview) {
                reviewErrorMessage = "Vui long dang nhap de viet danh gia."
                onDone(false)
                return@launch
            }

            isReviewLoading = true
            reviewErrorMessage = null
            try {
                val response = api.postReview(PostReviewRequest(bookId, rating, comment))
                if (response.isSuccessful) {
                    val review = response.body()?.review
                    if (review != null) {
                        allReviews = listOf(review) + allReviews.filterNot { it.reviewId == review.reviewId }
                    }
                    loadAllReviews(bookId)
                    loadBookDetail(bookId)
                    onDone(true)
                } else {
                    val serverMessage = runCatching {
                        JSONObject(response.errorBody()?.string().orEmpty()).optString("message")
                    }.getOrNull().orEmpty()
                    reviewErrorMessage = serverMessage.ifBlank {
                        "Khong the gui danh gia. Hay dang nhap lai va thu lai."
                    }
                    onDone(false)
                }
            } catch (e: Exception) {
                reviewErrorMessage = e.message ?: "Khong the gui danh gia."
                onDone(false)
            }
            isReviewLoading = false
        }
    }

    fun clearReviewError() {
        reviewErrorMessage = null
    }

    fun updateSearchQuery(query: String) {
        searchQuery = query
    }

    fun search(query: String) {
        viewModelScope.launch {
            val trimmedQuery = query.trim()
            searchQuery = query

            if (trimmedQuery.length < 2) {
                clearSearch(resetQuery = false)
                return@launch
            }

            isLoading = true
            isSearchActive = true
            recognizedText = null
            searchAuthorMatches = emptyList()
            searchResults = emptyList()
            try {
                val response = api.searchBooks(trimmedQuery)
                if (response.isSuccessful && response.body() != null) {
                    val element = response.body()!!
                    if (element.isJsonArray) {
                        searchResults = gson.fromJson(element, Array<Book>::class.java).toList()
                    } else if (element.isJsonObject) {
                        val obj = element.asJsonObject
                        if (obj.has("authorMatches")) {
                            searchAuthorMatches =
                                gson.fromJson(obj.get("authorMatches"), Array<AuthorInfo>::class.java).toList()
                        }
                        if (obj.has("data")) {
                            searchResults = gson.fromJson(obj.get("data"), Array<Book>::class.java).toList()
                        }
                    }
                }
            } catch (_: Exception) {
            }
            isLoading = false
        }
    }

    fun searchByVoice(audioPart: MultipartBody.Part, onDone: () -> Unit = {}) {
        Log.d("BookViewModel", "searchByVoice called with audio part")
        viewModelScope.launch {
            isLoading = true
            isSearchActive = true
            recognizedText = null
            searchAuthorMatches = emptyList()
            searchResults = emptyList()
            try {
                val response = api.voiceSearch(audioPart)
                Log.d("BookViewModel", "searchByVoice response: ${response.code()}")
                if (response.isSuccessful && response.body() != null) {
                    applyAiSearchResult(response.body()!!)
                    Log.d("BookViewModel", "searchByVoice found: ${searchResults.size} books")
                }
            } catch (e: Exception) {
                Log.e("BookViewModel", "searchByVoice error", e)
            }
            isLoading = false
            onDone()
        }
    }

    fun searchByImage(imagePart: MultipartBody.Part, onDone: () -> Unit = {}) {
        Log.d("BookViewModel", "searchByImage called")
        viewModelScope.launch {
            isLoading = true
            isSearchActive = true
            recognizedText = null
            searchAuthorMatches = emptyList()
            searchResults = emptyList()
            try {
                val response = api.imageSearch(imagePart)
                Log.d("BookViewModel", "searchByImage response: ${response.code()}")
                if (response.isSuccessful && response.body() != null) {
                    applyAiSearchResult(response.body()!!)
                    Log.d("BookViewModel", "searchByImage found: ${searchResults.size} books")
                }
            } catch (e: Exception) {
                Log.e("BookViewModel", "searchByImage error", e)
            }
            isLoading = false
            onDone()
        }
    }

    fun clearSearch(resetQuery: Boolean = true) {
        searchResults = emptyList()
        searchAuthorMatches = emptyList()
        recognizedText = null
        selectedAuthor = null
        isSearchActive = false
        if (resetQuery) {
            searchQuery = ""
        }
    }

    private fun applyAiSearchResult(result: AISearchResponse) {
        recognizedText = result.recognizedText
        searchQuery = result.recognizedText.orEmpty()
        searchAuthorMatches = emptyList()
        searchResults = result.results
    }
}

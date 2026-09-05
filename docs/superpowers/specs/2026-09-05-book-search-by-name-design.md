# Book Search by Name — Design

## Summary

Add the ability to search for books by title/name via Google Books API, alongside the existing ISBN barcode lookup. Users see a list of results and pick the correct one.

## Requirements

- Search Google Books API by title query (not just ISBN)
- Display multiple results (5-8) for user selection
- Trigger search via button click (not auto-debounce)
- Integrate into ISBNScanner as a tab, and as a standalone component

## Backend Changes

### `lib/google-books.ts`

- Add `searchBooksByName(query: string, fetcher?): Promise<BookInfo[]>`
  - Calls Google Books API: `q=${encodeURIComponent(query)}&maxResults=8`
  - Returns array of `BookInfo` (reuses existing type)
  - Empty array if no results or error

### `app/api/search/route.ts` (new)

- `GET /api/search?q=<query>`
  - Validates `q` param (min 2 chars)
  - Calls `searchBooksByName(q)`
  - Returns `{ ok: true, books: BookInfo[] }` or `{ ok: false, error: "EMPTY_QUERY" | "NO_RESULTS" }`

## Frontend Changes

### `app/components/BookNameSearch.tsx` (new)

- Input field + "Tìm" button
- Calls `/api/search?q=...` on button click
- Displays result list: thumbnail, title, author, category
- Each result is clickable → calls `onFound(isbn, bookInfo)` callback
- Reuses `BookInfo` type from `SpeedScanner`

### `app/components/ISBNScanner.tsx` (modify)

- Add tab UI: [Quét barcode | Tìm theo tên]
- Default tab: barcode scan
- Second tab: renders `BookNameSearch` with same `onFound` callback
- Tab state managed internally via `useState`

### `app/components/SpeedScanner.tsx` (no change needed)

- Already uses `ISBNScanner` which will get the tab for free

### `app/components/PurchaseBookScanner.tsx` (no change needed)

- Already uses `ISBNScanner` which will get the tab for free

## Data Flow

```
User types name → clicks "Tìm"
  → GET /api/search?q=name
  → Google Books API (intitle:name)
  → Returns BookInfo[]
  → UI renders list
  → User clicks a result
  → onFound(isbn, book) → SpeedForm / PurchaseBookScanner fills in data
```

## Error Handling

- Empty query → show "Nhập tên sách để tìm"
- No results → show "Không tìm thấy sách nào"
- Network error → show "Lỗi kết nối"
- Google Books API error → show generic error

## Testing

- Unit test `searchBooksByName` with stub fetch (similar to existing `lookupISBN` tests)
- Unit test `/api/search` route (similar to existing `lookup-route.test.ts`)
- Update `ISBNScanner` tests if needed

## Out of Scope

- Pagination / load more
- Autocomplete / debounced search
- Searching by author (only title)

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableColumn<T> {
  header: string;
  accessorKey?: keyof T;
  id?: string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  pagination?: boolean;
  pageSize?: number;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedItems: T[]) => void;
  showRowNumbers?: boolean;
  isLoading?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  searchable = true,
  searchKeys,
  pagination = true,
  pageSize = 10,
  onRowClick,
  selectable = false,
  onSelectionChange,
  showRowNumbers = false,
  isLoading = false,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Filter data based on search query
  const filteredData = searchable && searchQuery
    ? data.filter((item) => {
        if (!searchKeys) {
          // By default, search all string and number fields
          return Object.entries(item as Record<string, unknown>).some(
            ([key, value]) => {
              if (typeof value === "string" || typeof value === "number") {
                return value
                  .toString()
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase());
              }
              return false;
            }
          );
        } else {
          // Search only specified keys
          return searchKeys.some((key) => {
            const value = item[key];
            if (typeof value === "string" || typeof value === "number") {
              return value
                .toString()
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            }
            return false;
          });
        }
      })
    : data;

  // Paginate data
  const totalPages = pagination
    ? Math.ceil(filteredData.length / pageSize)
    : 1;
  const paginatedData = pagination
    ? filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredData;

  // Handle item selection
  const isItemSelected = (item: T) => selectedItems.some(
    (selectedItem) => JSON.stringify(selectedItem) === JSON.stringify(item)
  );

  const toggleSelectItem = (item: T, event: React.MouseEvent) => {
    event.stopPropagation();
    const selected = isItemSelected(item);
    
    const newSelectedItems = selected
      ? selectedItems.filter(i => JSON.stringify(i) !== JSON.stringify(item))
      : [...selectedItems, item];
    
    setSelectedItems(newSelectedItems);
    onSelectionChange?.(newSelectedItems);
  };

  const toggleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSelectAll(checked);
    
    const newSelectedItems = checked ? paginatedData : [];
    setSelectedItems(newSelectedItems);
    onSelectionChange?.(newSelectedItems);
  };

  // Calculate actual row numbers
  const getRowNumber = (index: number) => {
    return pagination ? (currentPage - 1) * pageSize + index + 1 : index + 1;
  };

  // Effect to reset selection when data changes
  React.useEffect(() => {
    setSelectedItems([]);
    setSelectAll(false);
  }, [data, searchQuery, currentPage]);

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
          />
        </div>
      )}

      {selectable && selectedItems.length > 0 && (
        <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
          <span className="text-sm text-gray-600 font-medium">
            {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
          </span>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => {
              if (onSelectionChange) {
                // Pass current selection to parent for processing
                onSelectionChange(selectedItems);
                
                // Clear local selection after sending to parent
                setSelectedItems([]);
                setSelectAll(false);
              }
            }}
            className="ml-2"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
          </Button>
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </TableHead>
                )}
                {showRowNumbers && (
                  <TableHead className="w-[50px] text-center">#</TableHead>
                )}
                {columns.map((column, index) => (
                  <TableHead key={index}>{column.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0) + (showRowNumbers ? 1 : 0)}
                    className="h-24 text-center"
                  >
                    <div className="flex justify-center items-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
                      <span className="ml-2">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((item, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    className={cn(
                      onRowClick && !selectable ? "cursor-pointer hover:bg-gray-50" : "",
                      isItemSelected(item) ? "bg-primary-50" : ""
                    )}
                    onClick={selectable ? undefined : () => onRowClick && onRowClick(item)}
                  >
                    {selectable && (
                      <TableCell className="w-[40px]">
                        <input
                          type="checkbox"
                          checked={isItemSelected(item)}
                          onChange={(e) => e.stopPropagation()}
                          onClick={(e) => toggleSelectItem(item, e)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </TableCell>
                    )}
                    {showRowNumbers && (
                      <TableCell className="text-center text-gray-500 text-sm font-medium">
                        {getRowNumber(rowIndex)}
                      </TableCell>
                    )}
                    {columns.map((column, cellIndex) => (
                      <TableCell key={cellIndex}>
                        {column.cell
                          ? column.cell(item)
                          : column.accessorKey ? (item[column.accessorKey as keyof T] as React.ReactNode) : ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0) + (showRowNumbers ? 1 : 0)}
                    className="h-24 text-center"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">
              {(currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(currentPage * pageSize, filteredData.length)}
            </span>{" "}
            of <span className="font-medium">{filteredData.length}</span> results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages centered around current page
                let pageNum = currentPage;
                if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                // Ensure page number is in valid range
                if (pageNum < 1 || pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={i}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "w-9",
                      pageNum === currentPage && "bg-primary-300 text-primary-foreground hover:bg-primary-300/90"
                    )}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

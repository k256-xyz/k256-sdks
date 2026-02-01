cmake_minimum_required(VERSION 3.16)
project(k256-sdk VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Header-only library
add_library(k256-sdk INTERFACE)
target_include_directories(k256-sdk INTERFACE
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)

# Optional: Find WebSocket++ for client functionality
find_package(websocketpp QUIET)
if(websocketpp_FOUND)
    target_link_libraries(k256-sdk INTERFACE websocketpp::websocketpp)
    target_compile_definitions(k256-sdk INTERFACE K256_HAS_WEBSOCKET)
endif()

# Install targets
include(GNUInstallDirs)
install(TARGETS k256-sdk
    EXPORT k256-sdk-targets
    INCLUDES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)

install(DIRECTORY include/k256
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)

install(EXPORT k256-sdk-targets
    FILE k256-sdk-targets.cmake
    NAMESPACE k256::
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/k256-sdk
)

# Package config
include(CMakePackageConfigHelpers)
configure_package_config_file(
    ${CMAKE_CURRENT_SOURCE_DIR}/cmake/k256-sdk-config.cmake.in
    ${CMAKE_CURRENT_BINARY_DIR}/k256-sdk-config.cmake
    INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/k256-sdk
)

write_basic_package_version_file(
    ${CMAKE_CURRENT_BINARY_DIR}/k256-sdk-config-version.cmake
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY SameMajorVersion
)

install(FILES
    ${CMAKE_CURRENT_BINARY_DIR}/k256-sdk-config.cmake
    ${CMAKE_CURRENT_BINARY_DIR}/k256-sdk-config-version.cmake
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/k256-sdk
)

# Examples
option(K256_BUILD_EXAMPLES "Build examples" OFF)
if(K256_BUILD_EXAMPLES)
    add_subdirectory(examples)
endif()

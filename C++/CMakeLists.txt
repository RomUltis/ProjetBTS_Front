cmake_minimum_required(VERSION 3.10)

# Nom du projet (Étudiant 3)
project(ProtectionLabo_Alerte)

# Spécifier le standard C++ (le standard actuel pour la session 2026)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Indiquer à CMake où se trouvent tes fichiers .h
include_directories(include)

# Lister tous tes fichiers sources .cpp pour la compilation
file(GLOB SOURCES "src/*.cpp")

# Créer l'exécutable final
add_executable(AppAlerte ${SOURCES})

# Si tu as installé libcurl pour l'API OVH, on l'ajoute ici
# find_package(CURL REQUIRED)
# target_link_libraries(AppAlerte PRIVATE CURL::libcurl)